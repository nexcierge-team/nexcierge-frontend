import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/db/sessions";
import { rateRfqLead } from "@/lib/db/rfqs";
import { captureServer } from "@/lib/analytics";
import type { LeadQuality } from "@/lib/supabase/types";

// AM rates the AI interview's output for a claimed brief: how usable was
// the handed-off lead (qualified / partial / junk), which brief fields
// were wrong or missing, and an optional free-text note. This is the
// ground-truth label for interview quality — the input to lesson
// generation (POST .../lessons) and, aggregated, the metric for whether
// prompt changes actually improve the agent. Re-rating overwrites.

const QUALITIES = new Set<LeadQuality>(["qualified", "partial", "junk"]);
// Enum slugs for "what was wrong" — mirrors the dashboard rating card's
// checkboxes. Kept enum (not free text) so issues aggregate in SQL and
// can be sent to PostHog without leaking transcript content.
const FIELD_ISSUES = new Set([
  "machine_type",
  "specs",
  "quantity",
  "delivery",
  "timeline",
  "contact",
]);
const MAX_NOTES_LENGTH = 2000;

interface PostBody {
  lead_quality?: string;
  field_issues?: unknown;
  notes?: string;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const quality = body.lead_quality as LeadQuality;
  if (!QUALITIES.has(quality)) {
    return NextResponse.json(
      { error: "lead_quality must be qualified | partial | junk" },
      { status: 400 },
    );
  }
  const fieldIssues = Array.isArray(body.field_issues)
    ? body.field_issues.filter(
        (v): v is string => typeof v === "string" && FIELD_ISSUES.has(v),
      )
    : [];
  const notes =
    typeof body.notes === "string"
      ? body.notes.trim().slice(0, MAX_NOTES_LENGTH)
      : "";

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  // Only the AM working the brief can judge it — same ownership rule as
  // replying. An unclaimed or someone-else's brief can't be rated.
  if (session.assigned_am_user_id !== gate.userId) {
    return NextResponse.json(
      { error: "Claim this brief before rating it" },
      { status: 409 },
    );
  }

  try {
    const rfq = await rateRfqLead(supabase, id, {
      quality,
      fieldIssues,
      notes,
      ratedBy: gate.userId,
    });
    captureServer(gate.userId, "am_lead_rated", {
      session_id: id,
      lead_quality: quality,
      field_issues: fieldIssues,
    });
    return NextResponse.json({ rfq });
  } catch (e) {
    console.error("lead rating failed:", e);
    return NextResponse.json({ error: "Rating failed" }, { status: 500 });
  }
}
