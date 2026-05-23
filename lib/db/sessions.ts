import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatSessionsRow } from "@/lib/supabase/types";

// See note in lib/db/messages.ts about the untyped client. Same applies here.
type Client = SupabaseClient;

// Returns the user's most-recent active (non-closed) session, or null
// if they have none. We treat the most recently updated 'ai' or
// 'in_handoff' row as "active" — buyers can have multiple sessions over
// time (sidebar), but always land in the latest open one on /chat.
export async function findActiveSession(
  supabase: Client,
  userId: string,
): Promise<ChatSessionsRow | null> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["ai", "in_handoff"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSession(
  supabase: Client,
  userId: string,
): Promise<ChatSessionsRow> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSession(
  supabase: Client,
  sessionId: string,
): Promise<ChatSessionsRow | null> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listSessionsForUser(
  supabase: Client,
  userId: string,
): Promise<ChatSessionsRow[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// Update the buyer-selected output language on a session. RLS narrows
// this to the session owner (chat_sessions_update_own_or_assigned_am),
// so a misconfigured client can't change someone else's language.
export async function setSessionLanguage(
  supabase: Client,
  sessionId: string,
  language: string,
): Promise<ChatSessionsRow | null> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ language })
    .eq("id", sessionId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Atomically claim the handoff slot for this session. Flips status
// from 'ai' → 'in_handoff' only if no concurrent caller has already
// claimed it. Returns true when this caller won the race, false when
// the row was already past 'ai' (another request beat us, or the
// session was closed). Callers MUST gate the non-idempotent
// downstream work (HubSpot deal creation, closing-message inserts)
// on a true return — that's the only thing preventing duplicate
// deals on a double-clicked Request human review button.
export async function tryClaimHandoff(
  supabase: Client,
  sessionId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({
      status: "in_handoff",
      handoff_requested_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "ai")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

// Roll back a tryClaimHandoff() that we couldn't complete (HubSpot
// rejected a profile field as invalid). Restores status='ai' and
// clears handoff_requested_at so the buyer can correct the field and
// retry. Scoped to the row we just claimed via the status guard.
export async function revertHandoff(
  supabase: Client,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      status: "ai",
      handoff_requested_at: null,
    })
    .eq("id", sessionId)
    .eq("status", "in_handoff");
  if (error) throw error;
}

/**
 * Bulk reassign every chat_session owned by `fromUserId` to `toUserId`.
 * Used by /auth/callback when a freshly-signed-in user is taking over
 * data from the anonymous user they were a moment ago. Caller must use
 * the service-role client to bypass RLS.
 */
export async function transferSessionsOwnership(
  supabase: Client,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({ user_id: toUserId })
    .eq("user_id", fromUserId);
  if (error) throw error;
}
