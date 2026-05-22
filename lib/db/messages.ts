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
  // Optional ISO timestamp. When omitted, Postgres assigns
  // `default now()` — fine for single-row inserts. For BULK inserts in
  // a single transaction, every row gets the same `now()` value, which
  // makes `order by created_at` ambiguous. Callers (e.g. the handoff
  // flow that inserts AI close + divider + AM welcome together) should
  // pass staggered timestamps to guarantee render order.
  createdAt?: string;
}

export async function insertMessage(
  supabase: Client,
  args: InsertMessageArgs,
): Promise<ChatMessagesRow> {
  const row: Record<string, unknown> = {
    chat_session_id: args.sessionId,
    sender_type: args.senderType,
    sender_user_id: args.senderUserId ?? null,
    content: args.content,
    metadata: args.metadata ?? {},
  };
  if (args.createdAt) row.created_at = args.createdAt;
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Mark every "incoming" message in a session as read by the current
// user. RLS narrows the UPDATE to messages whose sender_type matches
// the policy for the calling role (buyer marks non-user messages, AM
// marks user messages). Returns the list of message ids that were
// actually flipped so callers can broadcast / dedupe.
export async function markIncomingMessagesRead(
  supabase: Client,
  sessionId: string,
): Promise<string[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("chat_messages")
    .update({ read_at: nowIso })
    .eq("chat_session_id", sessionId)
    .is("read_at", null)
    .select("id");
  if (error) throw error;
  return (data ?? []).map((row: { id: string }) => row.id);
}

// Bulk insert preserving caller-provided order. Used by the handoff flow
// to insert AI close + divider + AM welcome in one shot.
//
// Order guarantee: if any row omits `createdAt`, we auto-stagger every
// row by 1 ms starting from the current wall-clock so the resulting
// `created_at` values are strictly increasing in the same order as
// `rows`. Without this, all rows share one `now()` and `order by
// created_at` is ambiguous on reload.
export async function insertMessages(
  supabase: Client,
  rows: InsertMessageArgs[],
): Promise<ChatMessagesRow[]> {
  if (rows.length === 0) return [];
  const baseTs = Date.now();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(
      rows.map((r, i) => ({
        chat_session_id: r.sessionId,
        sender_type: r.senderType,
        sender_user_id: r.senderUserId ?? null,
        content: r.content,
        metadata: r.metadata ?? {},
        created_at: r.createdAt ?? new Date(baseTs + i).toISOString(),
      })),
    )
    .select();
  if (error) throw error;
  return data ?? [];
}
