import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getOrCreateUser, getUser, type RouteAuth } from "@/lib/supabase/route";
import {
  createSession,
  findActiveSession,
  findNeverStartedSession,
  getSession,
  listSessionsForUser,
} from "@/lib/db/sessions";
import { createRfq, getRfq } from "@/lib/db/rfqs";
import { buildBootstrapPayload } from "@/lib/chatBootstrapPayload";
import { listMessages } from "@/lib/db/messages";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimited429,
} from "@/lib/rateLimit";
import { captureServer } from "@/lib/analytics";
import { createTiming } from "@/lib/timing";
import type {
  ChatMessagesRow,
  ChatSessionsRow,
  RfqsRow,
} from "@/lib/supabase/types";

// Bootstrap the chat for the current user.
//
// GET /api/chat/start                    → newest active session, or create one
// GET /api/chat/start?session_id=<uuid>  → load a specific past session (must be owned by user)
// GET /api/chat/start?new=1              → a blank session (reuses a never-started one)
//
// Anonymous sign-in happens here on first call if there's no Supabase
// session yet. From this point on the rest of the API can assume
// `user_id` is always present.
//
// The response also carries the sidebar list (`sessions`), so the chat
// page needs no separate GET /api/chat/sessions on load. Independent reads
// run in parallel; a brand-new visitor skips the reads that can only be
// empty.
export async function GET(req: Request) {
  const t = createTiming();
  const url = new URL(req.url);
  const requestedId = url.searchParams.get("session_id");
  // ?new=1 forces a blank-slate chat_session even if the user already has
  // an active one with messages. Used by the marketing-site chat preview /
  // FAB so every entry from the homepage starts fresh. A leftover
  // never-started session IS a blank slate, so we reuse it rather than
  // stacking another empty row per homepage visit.
  const forceNew = url.searchParams.get("new") === "1";

  // Existing (verified) session? No network call with asymmetric JWT keys.
  let auth: RouteAuth | null = await getUser();
  let newUser = false;
  if (!auth) {
    // About to create an auth.users row: IP-based rate limit. This is the
    // bot surface where an unbounded loop mints anonymous users (limit
    // rationale in RATE_LIMITS). Returning visitors skip it entirely.
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(
      `chat-start:ip:${ip}`,
      RATE_LIMITS.chatStart,
    );
    if (!ipLimit.allowed) return rateLimited429(ipLimit);
    auth = await getOrCreateUser();
    newUser = true;
  }
  t.mark("auth");
  if (!auth) {
    return NextResponse.json(
      {
        error:
          "auth not configured — check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 },
    );
  }
  const userId = auth.userId;
  const supabase = await getSupabaseServer();

  let session: ChatSessionsRow | null;
  let rfq: RfqsRow | null = null;
  let messages: ChatMessagesRow[] = [];
  let sessions: ChatSessionsRow[] = [];

  const startNewSession = async (source: string) => {
    const created = await createSession(supabase, userId);
    captureServer(userId, "chat_session_started", {
      session_id: created.id,
      source,
    });
    return created;
  };

  if (newUser) {
    // A user created a moment ago owns nothing: no lookups needed.
    if (requestedId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    session = await startNewSession(forceNew ? "homepage_new" : "bootstrap");
    rfq = await createRfq(supabase, {
      sessionId: session.id,
      userId,
      skipIdentityLookup: true,
    });
  } else if (requestedId) {
    // Ownership is checked after the parallel reads; RLS already scopes
    // them to the caller, so a foreign id just reads as null / [].
    [session, rfq, messages, sessions] = await Promise.all([
      getSession(supabase, requestedId),
      getRfq(supabase, requestedId),
      listMessages(supabase, requestedId),
      listSessionsForUser(supabase, userId),
    ]);
    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  } else {
    [session, sessions] = await Promise.all([
      forceNew
        ? findNeverStartedSession(supabase, userId)
        : findActiveSession(supabase, userId),
      listSessionsForUser(supabase, userId),
    ]);
    if (!session) {
      session = await startNewSession(forceNew ? "homepage_new" : "bootstrap");
    } else {
      [rfq, messages] = await Promise.all([
        getRfq(supabase, session.id),
        listMessages(supabase, session.id),
      ]);
    }
  }
  if (!rfq) {
    rfq = await createRfq(supabase, { sessionId: session.id, userId });
  }
  t.mark("load");
  t.log("chat_start_timing", { new_user: newUser, has_session_id: Boolean(requestedId) });

  return NextResponse.json(
    buildBootstrapPayload({ auth, session, rfq, messages, sessions }),
    { headers: t.headers() },
  );
}
