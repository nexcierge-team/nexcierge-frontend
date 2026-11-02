// Shape of the chat bootstrap payload returned by GET /api/chat/start and
// POST /api/chat/sessions (new conversation). One builder so the two can't
// drift; the client (lib/useChat.ts) consumes either interchangeably.
// SERVER ONLY (route handlers).

import { rfqRowToProfile } from "@/lib/db/rfqs";
import type { RouteAuth } from "@/lib/supabase/route";
import type {
  ChatMessagesRow,
  ChatSessionsRow,
  RfqsRow,
} from "@/lib/supabase/types";

export function toSidebarRow(s: ChatSessionsRow) {
  return {
    id: s.id,
    title: s.title,
    status: s.status,
    updated_at: s.updated_at,
    sourcing_stage: s.sourcing_stage ?? null,
    handoff_requested_at: s.handoff_requested_at ?? null,
  };
}

export function buildBootstrapPayload(args: {
  auth: RouteAuth;
  session: ChatSessionsRow;
  rfq: RfqsRow;
  messages: ChatMessagesRow[];
  // Sidebar list. null = not loaded by this route (the client keeps its
  // current list).
  sessions: ChatSessionsRow[] | null;
}) {
  const { auth, session, rfq, messages, sessions } = args;
  return {
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
      sourcing_stage: session.sourcing_stage ?? null,
      sourcing_stage_history: session.sourcing_stage_history ?? {},
    },
    messages,
    profile: rfqRowToProfile(rfq),
    profile_complete: rfq.is_complete,
    review_requested: session.status !== "ai",
    sessions: sessions ? sessions.map(toSidebarRow) : null,
  };
}
