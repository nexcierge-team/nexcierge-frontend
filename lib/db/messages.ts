import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessagesRow, ChatSenderType } from "@/lib/supabase/types";
import { broadcastToSession } from "@/lib/supabase/broadcast";

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

// Slim history read for the Gemini turn: only the columns the backend
// history needs, not `select *` (metadata / translations can be large).
// /api/chat reads this BEFORE inserting the new user message, so the new
// message is never duplicated into history (it goes to the backend as
// `message`), and an empty history really means "first turn".
export type HistoryRow = Pick<
  ChatMessagesRow,
  "id" | "sender_type" | "content" | "created_at"
>;

export async function listHistory(
  supabase: Client,
  sessionId: string,
): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, sender_type, content, created_at")
    .eq("chat_session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HistoryRow[];
}

interface InsertMessageArgs {
  sessionId: string;
  senderType: ChatSenderType;
  senderUserId?: string | null;
  content: string;
  // Pre-computed translation of `content` into the buyer's chosen
  // session language. Set on AM messages when session.language !== 'en'.
  // Null otherwise (AI messages are generated directly in the target
  // language; user messages are shown verbatim).
  translatedContent?: string | null;
  translatedTo?: string | null;
  metadata?: Record<string, unknown>;
  // Optional ISO timestamp. When omitted, Postgres assigns
  // `default now()` — fine for single-row inserts. For BULK inserts in
  // a single transaction, every row gets the same `now()` value, which
  // makes `order by created_at` ambiguous. Callers (e.g. the handoff
  // flow that inserts AI close + divider + AM welcome together) should
  // pass staggered timestamps to guarantee render order.
  createdAt?: string;
  // Client-generated idempotency key (buyer sends only). Unique per
  // session (migration 0018) — a duplicate delivery raises 23505, which
  // callers detect via isDuplicateMessageError() and resolve with
  // findMessageByClientId() instead of inserting twice.
  clientMessageId?: string;
}

// True when an insertMessage failure is the unique-index conflict on
// (chat_session_id, client_message_id) — i.e. this exact send was
// already persisted by an earlier delivery of the same request.
export function isDuplicateMessageError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "23505"
  );
}

export async function findMessageByClientId(
  supabase: Client,
  sessionId: string,
  clientMessageId: string,
): Promise<ChatMessagesRow | null> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_session_id", sessionId)
    .eq("client_message_id", clientMessageId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// The AI reply that answered a given user message. Used by the
// duplicate-send path in /api/chat to return the original turn's reply to
// a retry.
//
// AI rows written since the streaming change carry
// `metadata.reply_to = <user message id>`, an exact match. Older rows
// don't, so we fall back to "earliest AI row after the user message",
// restricted to rows WITHOUT reply_to. Otherwise a retry of a failed turn
// could pick up the reply to a LATER message.
export async function findAiReplyFor(
  supabase: Client,
  sessionId: string,
  userMessage: Pick<ChatMessagesRow, "id" | "created_at">,
): Promise<ChatMessagesRow | null> {
  const exact = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_session_id", sessionId)
    .eq("sender_type", "ai")
    .eq("metadata->>reply_to", userMessage.id)
    .limit(1)
    .maybeSingle();
  if (exact.error) throw exact.error;
  if (exact.data) return exact.data;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_session_id", sessionId)
    .eq("sender_type", "ai")
    .is("metadata->>reply_to", null)
    .gt("created_at", userMessage.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── AI-turn state on the user message row ─────────────────────────────
//
// A buyer message that starts an AI turn is inserted with
// metadata.turn = "running" + turn_started_at. If the turn fails (backend
// error, empty reply, truncated stream) it flips to "failed" and NO AI row
// is written. A retry with the same client_message_id then lands on the
// duplicate path, sees no AI reply, and may re-run the turn by CLAIMING it
// with a compare-and-swap. Without this, a failed turn could never be
// retried: the duplicate path returned `ai_pending` forever.

export type TurnState = "running" | "failed";

// A "running" turn older than this is presumed dead (the function was
// killed mid-turn) and may be claimed by a retry. Comfortably above the
// route's maxDuration (60 s).
export const STALE_TURN_MS = 75_000;

interface TurnMeta {
  turn?: TurnState;
  turn_started_at?: string;
}

export function readTurnMeta(row: Pick<ChatMessagesRow, "metadata" | "created_at">): {
  state: TurnState | null;
  startedAt: string;
} {
  const meta = (row.metadata ?? {}) as TurnMeta;
  return {
    state: meta.turn ?? null,
    startedAt: meta.turn_started_at ?? row.created_at,
  };
}

// Set turn state with the admin client (buyers can't update their own
// message rows under RLS). Best-effort: a failed write only means a later
// retry waits for STALE_TURN_MS instead of re-running immediately.
export async function setTurnState(
  admin: Client,
  row: Pick<ChatMessagesRow, "id" | "metadata">,
  state: TurnState,
): Promise<void> {
  const base = (row.metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin
    .from("chat_messages")
    .update({ metadata: { ...base, turn: state } })
    .eq("id", row.id);
  if (error) console.error("setTurnState failed:", error);
}

// Atomically take over a dead or failed turn for a retry. The UPDATE only
// matches if the row still has the exact (turn, turn_started_at) we read,
// so two concurrent retries can't both re-run Gemini. Returns the updated
// row when this caller won, null otherwise.
export async function claimTurn(
  admin: Client,
  row: Pick<ChatMessagesRow, "id" | "metadata" | "created_at">,
): Promise<ChatMessagesRow | null> {
  const meta = (row.metadata ?? {}) as TurnMeta & Record<string, unknown>;
  const nextMeta = {
    ...meta,
    turn: "running" as const,
    turn_started_at: new Date().toISOString(),
  };
  let q = admin
    .from("chat_messages")
    .update({ metadata: nextMeta })
    .eq("id", row.id);
  q = meta.turn ? q.eq("metadata->>turn", meta.turn) : q.is("metadata->>turn", null);
  q = meta.turn_started_at
    ? q.eq("metadata->>turn_started_at", meta.turn_started_at)
    : q.is("metadata->>turn_started_at", null);
  const { data, error } = await q.select().maybeSingle();
  if (error) {
    console.error("claimTurn failed:", error);
    return null;
  }
  return (data as ChatMessagesRow | null) ?? null;
}

// Merge keys into a message's metadata (admin client). Used to attach
// quick-reply pills to the AI row after the reply has already been saved
// and streamed. Best-effort, never throws.
export async function mergeMessageMetadata(
  admin: Client,
  row: Pick<ChatMessagesRow, "id" | "metadata">,
  patch: Record<string, unknown>,
): Promise<void> {
  const base = (row.metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin
    .from("chat_messages")
    .update({ metadata: { ...base, ...patch } })
    .eq("id", row.id);
  if (error) console.error("mergeMessageMetadata failed:", error);
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
    translated_content: args.translatedContent ?? null,
    translated_to: args.translatedTo ?? null,
    metadata: args.metadata ?? {},
  };
  if (args.createdAt) row.created_at = args.createdAt;
  if (args.clientMessageId) row.client_message_id = args.clientMessageId;
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
// actually flipped.
//
// After the SQL UPDATE we also fire a `mark_read` broadcast on the
// session channel. We don't trust postgres_changes UPDATE events to
// reach every subscriber across distinct auth contexts — buyers were
// not seeing the AM's mark-read in real time even though AMs received
// the buyer's mark-read just fine. The broadcast is the canonical
// signal for read-receipt updates; the UPDATE listener stays as a
// secondary path.
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
  const ids = (data ?? []).map((row: { id: string }) => row.id);
  if (ids.length > 0) {
    try {
      await broadcastToSession(sessionId, "mark_read", {
        ids,
        read_at: nowIso,
      });
    } catch (e) {
      console.error("mark_read broadcast failed (UI may be stale):", e);
    }
  }
  return ids;
}

// Persist an AM-dashboard translation of a single message into
// `metadata.translations[lang]`, merging into the row's existing
// metadata (the caller passes it in so we skip a re-read). Requires the
// service-role admin client — RLS won't let an AM update buyer/AI rows.
//
// Best-effort: logs and swallows on failure. A cache-write hiccup must
// never block the AM's view; the worst case is we re-translate next time.
export async function cacheMessageTranslation(
  admin: Client,
  messageId: string,
  currentMetadata: Record<string, unknown> | null | undefined,
  lang: string,
  translated: string,
): Promise<void> {
  const base =
    currentMetadata && typeof currentMetadata === "object"
      ? currentMetadata
      : {};
  const existing =
    (base as { translations?: Record<string, string> }).translations ?? {};
  const metadata = {
    ...base,
    translations: { ...existing, [lang]: translated },
  };
  const { error } = await admin
    .from("chat_messages")
    .update({ metadata })
    .eq("id", messageId);
  if (error) console.error("cacheMessageTranslation failed:", error);
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

/**
 * Re-point the buyer's own messages from one user id to another. Used by
 * /auth/callback after sign-in, alongside transferSessionsOwnership /
 * transferRfqsOwnership: sign-in produces a NEW permanent user id, and
 * without this the buyer's pre-sign-in messages would keep referencing
 * the old anonymous user. That broke the anonymous-user cleanup job (its
 * single DELETE failed on the foreign key) and mis-attributed the rows.
 * Caller must use the service-role client to bypass RLS.
 */
export async function transferMessagesSender(
  admin: Client,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const { error } = await admin
    .from("chat_messages")
    .update({ sender_user_id: toUserId })
    .eq("sender_user_id", fromUserId)
    .eq("sender_type", "user");
  if (error) throw error;
}

