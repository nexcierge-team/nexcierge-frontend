import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessagesRow, ChatSenderType } from "@/lib/supabase/types";

// Untyped client until `supabase gen types` populates lib/supabase/types.ts
// with the auto-generated schema. The hand-rolled Database type doesn't
// satisfy the SDK's GenericSchema constraint precisely enough — once
// types are regenerated, swap back to SupabaseClient<Database>.
type Client = SupabaseClient;

export async function listMessages(
  supabase: Client,
  sessionId: string,
): Promise<ChatMessagesRow[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface InsertMessageArgs {
  sessionId: string;
  senderType: ChatSenderType;
  senderUserId?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}

export async function insertMessage(
  supabase: Client,
  args: InsertMessageArgs,
): Promise<ChatMessagesRow> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      chat_session_id: args.sessionId,
      sender_type: args.senderType,
      sender_user_id: args.senderUserId ?? null,
      content: args.content,
      metadata: args.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Bulk insert preserving caller-provided order. Used by the handoff flow
// to insert AI close + divider + AM welcome in one shot.
export async function insertMessages(
  supabase: Client,
  rows: InsertMessageArgs[],
): Promise<ChatMessagesRow[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(
      rows.map((r) => ({
        chat_session_id: r.sessionId,
        sender_type: r.senderType,
        sender_user_id: r.senderUserId ?? null,
        content: r.content,
        metadata: r.metadata ?? {},
      })),
    )
    .select();
  if (error) throw error;
  return data ?? [];
}
