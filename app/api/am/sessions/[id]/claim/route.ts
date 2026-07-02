import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getRfq } from "@/lib/db/rfqs";
import { hubspotEnabled } from "@/lib/hubspot/client";
import { advanceDealStage } from "@/lib/hubspot/sync";
import { captureServer } from "@/lib/analytics";

// Claim an unassigned brief. Only updates the row if it's still
// unclaimed (cheap optimistic-concurrency check) — two AMs racing on
// the same brief both succeed at the SDK level, but the second update
// is a no-op and we return the actual owner so the UI can refresh.
//
// On successful claim we also advance the linked HubSpot deal from
// "Human Review Requested" → "Assigned to Account Manager" so the CRM
// pipeline reflects the AM picking up the work in real time. Non-fatal:
// HubSpot reconciliation problems must not fail the claim itself.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ assigned_am_user_id: gate.userId })
    .eq("id", id)
    .is("assigned_am_user_id", null)
    .select()
    .maybeSingle();

  if (error) {
    console.error("claim failed:", error);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }

  if (!data) {
    // Already claimed by someone else (or doesn't exist).
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("assigned_am_user_id")
      .eq("id", id)
      .maybeSingle();
    return NextResponse.json(
      {
        claimed: false,
        assigned_am_user_id: existing?.assigned_am_user_id ?? null,
      },
      { status: 409 },
    );
  }

  captureServer(gate.userId, "am_brief_claimed", { session_id: id });

  // Advance the HubSpot deal stage. Skipped silently when:
  //   - HubSpot is disabled or unconfigured
  //   - This session was never handed off through HubSpot (no deal id)
  //   - The "Assigned to Account Manager" stage id env var isn't set yet
  // Any HubSpot API failure is logged but does NOT fail the response —
  // the AM has successfully claimed the brief in our DB, and a CRM
  // sync glitch can be fixed by manually moving the card.
  const assignedStageId = process.env.HUBSPOT_DEALSTAGE_ASSIGNED_TO_AM;
  if (hubspotEnabled() && assignedStageId) {
    try {
      const rfq = await getRfq(supabase, id);
      if (rfq?.hubspot_deal_id) {
        await advanceDealStage(rfq.hubspot_deal_id, assignedStageId);
      }
    } catch (e) {
      console.error(
        "hubspot stage advance failed (claim still succeeded):",
        e,
      );
    }
  }

  return NextResponse.json({ claimed: true, session: data });
}
