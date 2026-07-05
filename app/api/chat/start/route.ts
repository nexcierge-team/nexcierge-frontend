import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import {
  createSession,
  findActiveSession,
  getSession,
} from "@/lib/db/sessions";
import { createRfq, getRfq, rfqRowToProfile } from "@/lib/db/rfqs";
import { listMessages } from "@/lib/db/messages";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimited429,
} from "@/lib/rateLimit";
import { captureServer } from "@/lib/analytics";

// Bootstrap the chat for the current user.
//
// GET /api/chat/start                    → newest active session, or create one
// GET /api/chat/start?session_id=<uuid>  → load a specific past session (must be owned by user)
//
// Anonymous sign-in happens here on first call if there's no Supabase
// session yet. From this point on the rest of the API can assume
// `user_id` is always present.
export async function GET(req: Request) {
  // IP-based rate limit BEFORE getOrCreateUser — this is the bot
  // surface where an unbounded loop creates auth.users rows (limit
  // rationale in RATE_LIMITS).
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(
    `chat-start:ip:${ip}`,
    RATE_LIMITS.chatStart,
  );
  if (!ipLimit.allowed) return rateLimited429(ipLimit);

  const auth = await getOrCreateUser();
  if (!auth) {
    return NextResponse.json(
      {
        error:
          "auth not configured — check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 },
    );
  }

  const supabase = await getSupabaseServer();
  const url = new URL(req.url);
  const requestedId = url.searchParams.get("session_id");
  // ?new=1 forces a brand-new chat_session even if the user already has
  // an active one. Used by the marketing-site chat preview / FAB so every
  // entry from the homepage starts on a blank slate.
  const forceNew = url.searchParams.get("new") === "1";

  let session = requestedId
    ? await getSession(supabase, requestedId)
    : forceNew
      ? null
      : await findActiveSession(supabase, auth.userId);

  if (requestedId && (!session || session.user_id !== auth.userId)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session) {
    session = await createSession(supabase, auth.userId);
    captureServer(auth.userId, "chat_session_started", {
      session_id: session.id,
      source: forceNew ? "homepage_new" : "bootstrap",
    });
  }

  let rfq = await getRfq(supabase, session.id);
  if (!rfq) {
    rfq = await createRfq(supabase, {
      sessionId: session.id,
      userId: auth.userId,
    });
  }

  const messages = await listMessages(supabase, session.id);

  return NextResponse.json({
    user: {
      id: auth.userId,
      email: auth.email,
      full_name: auth.fullName,
      is_anonymous: auth.isAnonymous,
    },
    session: {
      id: session.id,
      status: session.status,
      handoff_requested_at: session.handoff_requested_at,
      title: session.title,
      language: session.language ?? "en",
    },
    messages,
    profile: rfqRowToProfile(rfq),
    profile_complete: rfq.is_complete,
    review_requested: session.status !== "ai",
  });
}
