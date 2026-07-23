import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  createSession,
  findNeverStartedSession,
  listSessionsForUser,
} from "@/lib/db/sessions";
import { createRfq } from "@/lib/db/rfqs";
import { captureServer } from "@/lib/analytics";

// GET  /api/chat/sessions  → list the user's chat_sessions (sidebar).
// Anonymous users get only their own (which is at most their current one).
export async function GET() {
  const auth = await getOrCreateUser();
  if (!auth) {
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }
  const supabase = await getSupabaseServer();
  const sessions = await listSessionsForUser(supabase, auth.userId);
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      updated_at: s.updated_at,
    })),
    is_anonymous: auth.isAnonymous,
  });
}

// POST /api/chat/sessions  → return a blank chat_session + rfq.
// Used by the "New conversation" sidebar button. Reuses the user's
// existing never-started session (opened but nothing sent) when there
// is one — repeated clicks of "+" must not stack empty rows — and only
// creates (and instruments) a fresh session + rfq otherwise.
export async function POST() {
  const auth = await getOrCreateUser();
  if (!auth) {
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }
  const supabase = await getSupabaseServer();
  let session = await findNeverStartedSession(supabase, auth.userId);
  if (!session) {
    session = await createSession(supabase, auth.userId);
    await createRfq(supabase, { sessionId: session.id, userId: auth.userId });
    captureServer(auth.userId, "chat_session_started", {
      session_id: session.id,
      source: "sidebar_new",
    });
  }
  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      updated_at: session.updated_at,
    },
  });
}
