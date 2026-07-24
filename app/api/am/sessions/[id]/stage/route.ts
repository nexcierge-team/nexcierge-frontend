import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession, updateSourcingStage } from "@/lib/db/sessions";
import { getRfq } from "@/lib/db/rfqs";
import { hubspotEnabled } from "@/lib/hubspot/client";
import { advanceDealStage } from "@/lib/hubspot/sync";
import { captureServer } from "@/lib/analytics";
import { SOURCING_STAGES, type SourcingStage } from "@/lib/sourcingStages";

// AM manually sets the buyer-visible sourcing stage for a claimed brief.
// The first two stages (brief_submitted, in_review) are set
// programmatically at handoff and claim; everything after that reflects
// off-platform work (contacting suppliers, quotes, production...) that
// only the AM knows about, so the AM drives it from the stage picker in
// the brief sidebar. The buyer's progress rail updates live via the
// existing chat_sessions realtime channel.

// Slugs must stay in sync with SOURCING_STAGES in lib/sourcingStages.ts
// and the CHECK constraint in migration 0020.
const STAGES = new Set<string>(SOURCING_STAGES);

// Optional HubSpot pipeline mirroring: stages with a configured
// dealstage id advance the linked deal; unmapped stages skip silently.
const HUBSPOT_STAGE_ENV: Partial<Record<SourcingStage, string | undefined>> = {
  suppliers_contacted: process.env.HUBSPOT_DEALSTAGE_SUPPLIERS_CONTACTED,
  quotes_received: process.env.HUBSPOT_DEALSTAGE_QUOTES_RECEIVED,
  proposal_negotiation: process.env.HUBSPOT_DEALSTAGE_PROPOSAL_NEGOTIATION,
  order_production: process.env.HUBSPOT_DEALSTAGE_ORDER_PRODUCTION,
  inspection_logistics: process.env.HUBSPOT_DEALSTAGE_INSPECTION_LOGISTICS,
  delivered: process.env.HUBSPOT_DEALSTAGE_DELIVERED,
};

interface PostBody {
  stage?: string;
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

  const stage = body.stage;
  if (typeof stage !== "string" || !STAGES.has(stage)) {
    return NextResponse.json(
      { error: `stage must be one of: ${SOURCING_STAGES.join(" | ")}` },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  // Only the AM working the brief can move its stage — same ownership
  // rule as rating/replying. RLS enforces this too (the update below
  // matches nothing for a non-assigned AM); the explicit check turns
  // that into a clear 409 instead of a silent no-op.
  if (session.assigned_am_user_id !== gate.userId) {
    return NextResponse.json(
      { error: "Claim this brief before updating its stage" },
      { status: 409 },
    );
  }

  try {
    const updated = await updateSourcingStage(
      supabase,
      id,
      stage as SourcingStage,
    );
    if (!updated) {
      return NextResponse.json({ error: "Stage update failed" }, { status: 500 });
    }
    captureServer(gate.userId, "am_stage_updated", {
      session_id: id,
      stage,
    });

    // Mirror into the HubSpot pipeline when this stage is mapped.
    // Non-fatal by contract (see claim route): our DB is the source of
    // truth, a CRM glitch is a reconciliation problem.
    const dealStageId = HUBSPOT_STAGE_ENV[stage as SourcingStage];
    if (hubspotEnabled() && dealStageId) {
      try {
        const rfq = await getRfq(supabase, id);
        if (rfq?.hubspot_deal_id) {
          await advanceDealStage(rfq.hubspot_deal_id, dealStageId);
        }
      } catch (e) {
        console.error(
          "hubspot stage advance failed (stage update still succeeded):",
          e,
        );
      }
    }

    return NextResponse.json({ session: updated });
  } catch (e) {
    console.error("sourcing stage update failed:", e);
    return NextResponse.json({ error: "Stage update failed" }, { status: 500 });
  }
}
