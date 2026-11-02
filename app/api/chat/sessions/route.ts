import { NextResponse } from "next/server";
import { getOrCreateUser, getUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  createSession,
  findNeverStartedSession,
  listSessionsForUser,
} from "@/lib/db/sessions";
import { createRfq, getRfq } from "@/lib/db/rfqs";
import { listMessages } from "@/lib/db/messages";
import { captureServer } from "@/lib/analytics";
import {
  buildBootstrapPayload,
  toSidebarRow,
} from "@/lib/chatBootstrapPayload";

// GET  /api/chat/sessions  → list the user's chat_sessions (sidebar).
//
// Non-creating: with no session there's nothing to list, so this returns
// an empty list instead of minting an anonymous user. (It used to call
// getOrCreateUser, which raced GET /api/chat/start on a first visit: both
// signed in anonymously and whichever Set-Cookie landed last won,
// sometimes orphaning the session /start had just created.) The chat
// page now gets its initial list from /api/chat/start and only calls this
// when the signed-in identity changes.
export async function GET() {
  const auth = await getUser();
  if (!auth) {
    return NextResponse.json({ sessions: [], is_anonymous: true });
  }
  const supabase = await getSupabaseServer();
  const sessions = await listSessionsForUser(supabase, auth.userId);
  return NextResponse.json({
    sessions: sessions.map(toSidebarRow),
    is_anonymous: auth.isAnonymous,
  });
}

// POST /api/chat/sessions  → return a blank chat_session + rfq.
// Used by the "New conversation" sidebar button. Reuses the user's
// existing never-started session (opened but nothing sent) when there
// is one, so repeated clicks of "+" don't stack empty rows, and only
// creates (and instruments) a fresh session + rfq otherwise.
//
// The response includes the full bootstrap payload (same shape as GET
// /api/chat/start), so the client can switch to the new conversation
// without a second /start round trip.
export async function POST() {
  const auth = await getOrCreateUser();
  if (!auth) {
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }
  const supabase = await getSupabaseServer();
  let session = await findNeverStartedSession(supabase, auth.userId);
  let rfq;
  let messages: Awaited<ReturnType<typeof listMessages>> = [];
  if (!session) {
    session = await createSession(supabase, auth.userId);
    rfq = await createRfq(supabase, { sessionId: session.id, userId: auth.userId });
    captureServer(auth.userId, "chat_session_started", {
      session_id: session.id,
      source: "sidebar_new",
    });
  } else {
    // A never-started session has no buyer messages, but may carry
    // non-buyer rows in principle; load both to stay exact.
    [rfq, messages] = await Promise.all([
      getRfq(supabase, session.id),
      listMessages(supabase, session.id),
    ]);
    if (!rfq) {
      rfq = await createRfq(supabase, { sessionId: session.id, userId: auth.userId });
    }
  }
  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      updated_at: session.updated_at,
    },
    bootstrap: buildBootstrapPayload({
      auth,
      session,
      rfq,
      messages,
      sessions: null,
    }),
  });
}
