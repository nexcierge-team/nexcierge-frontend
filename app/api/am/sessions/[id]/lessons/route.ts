import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/db/sessions";
import { getRfq, rfqRowToProfile } from "@/lib/db/rfqs";
import { listMessages } from "@/lib/db/messages";
import { checkRateLimit, rateLimited429 } from "@/lib/rateLimit";
import { captureServer } from "@/lib/analytics";
import type { AgentLessonsRow } from "@/lib/supabase/types";

// AM-triggered lesson generation (Path 2 of the agent-improvement loop).
// Requires the brief to be claimed by the caller AND already rated
// (POST .../rating). Loads the AI-interview transcript + the rating from
// Supabase, asks FastAPI /draft-lessons for 0-3 machine-drafted lessons,
// and persists them to agent_lessons as `proposed` for the AM's
// approve/edit/reject review. Nothing consumes lessons automatically —
// approval is a human act, and approved lessons feed future prompt work.

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
// Drafting reads a whole transcript with thinking on — allow more than
// the translate route's 8s, but don't let the AM's click hang forever.
const DRAFT_TIMEOUT_MS = 45_000;

interface ProposedLesson {
  lesson_text: string;
  rationale: string;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;

  // Each click is a paid Gemini call over a full transcript — bound it.
  const limit = await checkRateLimit(`am-lessons:user:${gate.userId}`, 20, 3600);
  if (!limit.allowed) return rateLimited429(limit);

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.assigned_am_user_id !== gate.userId) {
    return NextResponse.json(
      { error: "Claim this brief before generating lessons" },
      { status: 409 },
    );
  }
  const rfq = await getRfq(supabase, id);
  if (!rfq) {
    return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  }
  if (!rfq.lead_quality) {
    return NextResponse.json(
      { error: "Rate this brief before generating lessons" },
      { status: 409 },
    );
  }

  // Only the AI interview is under review: user + ai rows, in order.
  // System dividers and post-handoff AM chatter are not the agent's doing.
  const messages = await listMessages(supabase, id);
  const transcript = messages
    .filter((m) => m.sender_type === "user" || m.sender_type === "ai")
    .map((m) => ({
      speaker: m.sender_type === "user" ? "buyer" : "agent",
      content: m.content,
    }))
    .filter((t) => t.content.trim());
  if (transcript.length === 0) {
    return NextResponse.json({ error: "No interview transcript" }, { status: 409 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DRAFT_TIMEOUT_MS);
  let lessons: ProposedLesson[];
  try {
    const res = await fetch(`${BACKEND_URL}/draft-lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        rating: rfq.lead_quality,
        field_issues: rfq.lead_quality_field_issues,
        notes: rfq.lead_quality_notes,
        profile: rfqRowToProfile(rfq),
        session_id: id,
        user_id: gate.userId,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("draft-lessons backend returned", res.status);
      return NextResponse.json(
        { error: "Lesson drafting failed" },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { lessons?: ProposedLesson[] };
    lessons = (data.lessons ?? []).filter(
      (l) => typeof l.lesson_text === "string" && l.lesson_text.trim(),
    );
  } catch (e) {
    console.error("draft-lessons call failed:", e);
    return NextResponse.json(
      { error: "Lesson drafting failed" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }

  let rows: AgentLessonsRow[] = [];
  if (lessons.length > 0) {
    const { data, error } = await supabase
      .from("agent_lessons")
      .insert(
        lessons.map((l) => ({
          chat_session_id: id,
          rfq_id: rfq.id,
          lesson_text: l.lesson_text.trim(),
          rationale: (l.rationale ?? "").trim(),
          created_by: gate.userId,
        })),
      )
      .select();
    if (error) {
      console.error("agent_lessons insert failed:", error);
      return NextResponse.json(
        { error: "Saving lessons failed" },
        { status: 500 },
      );
    }
    rows = (data ?? []) as AgentLessonsRow[];
  }

  captureServer(gate.userId, "agent_lessons_proposed", {
    session_id: id,
    lead_quality: rfq.lead_quality,
    lesson_count: rows.length,
  });
  return NextResponse.json({ lessons: rows });
}
