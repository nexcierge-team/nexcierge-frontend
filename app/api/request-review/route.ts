import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession, revertHandoff, tryClaimHandoff } from "@/lib/db/sessions";
import { getRfq, markRfqSubmitted } from "@/lib/db/rfqs";
import { insertMessages } from "@/lib/db/messages";
import {
  DIVIDER_LABEL,
  HANDOFF_REPLY,
  accountManagerWelcome,
  firstNameFromFull,
} from "@/lib/constants";
import { hubspotEnabled } from "@/lib/hubspot/client";
import { HubspotValidationError, syncBriefToHubspot } from "@/lib/hubspot/sync";
import { checkRateLimit, rateLimited429 } from "@/lib/rateLimit";
import { translateText } from "@/lib/translate";

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

  // Per-user cap on handoff attempts. HubSpot deal creation is non-
  // idempotent in the failure path and audited; 5/hour stops accidental
  // double-clicks-after-422 from creating a CRM mess.
  const handoffLimit = await checkRateLimit(
    `request-review:user:${auth.userId}`,
    5,
    3600,
  );
  if (!handoffLimit.allowed) return rateLimited429(handoffLimit);

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

  // Atomic claim — flip chat_sessions.status 'ai' → 'in_handoff' before
  // doing any non-idempotent work. A second concurrent POST (double
  // click, two tabs, retry) will lose this race and fall through to
  // the idempotent-success branch, so HubSpot deal creation runs at
  // most once per session.
  const claimed = await tryClaimHandoff(supabase, session.id);
  if (!claimed) {
    return NextResponse.json({
      already_handed_off: true,
      session: { id: session.id, status: "in_handoff" },
    });
  }

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
      // Validation errors (e.g. typo'd email) are FATAL — the buyer
      // needs to correct the profile before the brief is usable, and
      // silently handing off would leave the AM with an unreachable
      // contact. Revert the atomic claim so the buyer can fix the
      // field in chat and re-trigger handoff, then return 422.
      if (e instanceof HubspotValidationError) {
        await revertHandoff(supabase, session.id);
        return NextResponse.json(
          {
            error: "invalid_profile_field",
            field: e.field,
            value: e.value,
            message: e.message,
          },
          { status: 422 },
        );
      }
      // Other HubSpot failures (rate limit, network, etc.) are
      // non-fatal — let the buyer hand off; AM can create the deal
      // manually if needed.
      console.error(
        "hubspot sync failed — proceeding without CRM write:",
        e,
      );
    }
  }

  // Localize the canonical handoff copy into the buyer's language. By the
  // time the buyer hands off, the brief has completed — which pins
  // session.language — so we have a target. We store these auto-messages
  // directly in the buyer's language (like ai/user rows); the AM dashboard
  // translates them into the AM's working language on demand. English buyer
  // (or any translation failure) → the original English.
  const targetLanguage = session.language ?? "en";
  const welcomeEn = accountManagerWelcome(firstNameFromFull(rfq.full_name));
  let handoffReply = HANDOFF_REPLY;
  let welcome = welcomeEn;
  let divider = DIVIDER_LABEL;
  if (targetLanguage !== "en") {
    const [hr, wl, dv] = await Promise.all([
      translateText(HANDOFF_REPLY, targetLanguage),
      translateText(welcomeEn, targetLanguage),
      translateText(DIVIDER_LABEL, targetLanguage),
    ]);
    handoffReply = hr ?? HANDOFF_REPLY;
    welcome = wl ?? welcomeEn;
    divider = dv ?? DIVIDER_LABEL;
  }

  // Three closing messages, inserted server-side via admin client so
  // sender_type='ai' and 'system' bypass RLS cleanly.
  const inserted = await insertMessages(admin, [
    {
      sessionId: session.id,
      senderType: "ai",
      content: handoffReply,
    },
    {
      sessionId: session.id,
      senderType: "system",
      content: divider,
      metadata: { kind: "divider" },
    },
    {
      sessionId: session.id,
      senderType: "account_manager",
      // We use admin client so the AM-role check doesn't apply; this is
      // the auto-generated welcome, not a real AM reply.
      content: welcome,
      metadata: { kind: "auto_welcome" },
    },
  ]);

  return NextResponse.json({
    session: { id: session.id, status: "in_handoff" },
    inserted_messages: inserted,
  });
}
