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

export async function markHandoff(
  supabase: Client,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      status: "in_handoff",
      handoff_requested_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw error;
}
