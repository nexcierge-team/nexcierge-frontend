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
import { checkRateLimit, getClientIp, rateLimited429 } from "@/lib/rateLimit";

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
  // surface where an unbounded loop creates auth.users rows. 60/hour
  // per IP is generous for legit users (one bootstrap per first visit;
  // returning visitors reuse the cookie) but bounds anonymous-signup
  // spam to ~1500/day per source IP.
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(`chat-start:ip:${ip}`, 60, 3600);
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

  let session = requestedId
    ? await getSession(supabase, requestedId)
    : await findActiveSession(supabase, auth.userId);

  if (requestedId && (!session || session.user_id !== auth.userId)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session) {
    session = await createSession(supabase, auth.userId);
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
