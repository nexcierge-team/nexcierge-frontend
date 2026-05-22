import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession, markHandoff } from "@/lib/db/sessions";
import { getRfq, markRfqSubmitted } from "@/lib/db/rfqs";
import { insertMessages } from "@/lib/db/messages";
import {
  DIVIDER_LABEL,
  HANDOFF_REPLY,
  accountManagerWelcome,
  firstNameFromFull,
} from "@/lib/constants";
import { hubspotEnabled } from "@/lib/hubspot/client";
import { syncBriefToHubspot } from "@/lib/hubspot/sync";

interface RequestReviewBody {
  session_id: string;
}

// Buyer-triggered handoff. Auth-gated; pushes the brief into HubSpot
// (best-effort, non-fatal), flips chat_session.status='in_handoff',
// inserts the three closing messages (AI close, divider, AM welcome).
export async function POST(req: Request) {
  let body: RequestReviewBody;
  try {
    body = (await req.json()) as RequestReviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const auth = await getOrCreateUser();
  if (!auth) {
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, body.session_id);
  if (!session || session.user_id !== auth.userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Idempotent: re-clicking after handoff returns success without
  // re-inserting the closing messages or re-firing HubSpot.
  if (session.status !== "ai") {
    return NextResponse.json({
      already_handed_off: true,
      session: { id: session.id, status: session.status },
    });
  }

  const rfq = await getRfq(supabase, session.id);
  if (!rfq) {
    return NextResponse.json({ error: "Missing rfq" }, { status: 500 });
  }
  if (!rfq.is_complete) {
    return NextResponse.json(
      { error: "Profile is not complete yet" },
      { status: 409 },
    );
  }

  // Auth gate: handoff requires a real account so the AM has someone
  // to reach. Frontend opens AuthModal on this 401.
  if (auth.isAnonymous) {
    return NextResponse.json({ auth_required: true }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // HubSpot sync (idempotent — skipped if rfq already has hubspot_deal_id,
  // or if the feature flag / env vars are missing).
  if (hubspotEnabled() && !rfq.hubspot_deal_id) {
    try {
      const ids = await syncBriefToHubspot({ rfq });
      await markRfqSubmitted(admin, session.id, {
        contactId: ids.contactId,
        dealId: ids.dealId,
      });
    } catch (e) {
      // HubSpot is non-fatal: still let the buyer hand off. AM can
      // create the deal manually if needed. Log loudly.
      console.error(
        "hubspot sync failed — proceeding without CRM write:",
        e,
      );
    }
  }

  await markHandoff(supabase, session.id);

  // Three closing messages, inserted server-side via admin client so
  // sender_type='ai' and 'system' bypass RLS cleanly.
  const inserted = await insertMessages(admin, [
    {
      sessionId: session.id,
      senderType: "ai",
      content: HANDOFF_REPLY,
    },
    {
      sessionId: session.id,
      senderType: "system",
      content: DIVIDER_LABEL,
      metadata: { kind: "divider" },
    },
    {
      sessionId: session.id,
      senderType: "account_manager",
      // We use admin client so the AM-role check doesn't apply; this is
      // the auto-generated welcome, not a real AM reply.
      content: accountManagerWelcome(firstNameFromFull(rfq.full_name)),
      metadata: { kind: "auto_welcome" },
    },
  ]);

  return NextResponse.json({
    session: { id: session.id, status: "in_handoff" },
    inserted_messages: inserted,
  });
}
