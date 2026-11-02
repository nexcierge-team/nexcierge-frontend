import { after, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import {
  getSupabaseServer,
  getSupabaseWithAccessToken,
} from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getSession,
  markSessionLanguageResolved,
  setSessionLanguage,
} from "@/lib/db/sessions";
import {
  claimTurn,
  findAiReplyFor,
  findMessageByClientId,
  insertMessage,
  isDuplicateMessageError,
  listHistory,
  mergeMessageMetadata,
  readTurnMeta,
  setTurnState,
  STALE_TURN_MS,
  type HistoryRow,
} from "@/lib/db/messages";
import {
  getRfq,
  profileToRfqUpdate,
  rfqRowToProfile,
  updateRfqFields,
} from "@/lib/db/rfqs";
import { checkRateLimit, RATE_LIMITS, rateLimited429 } from "@/lib/rateLimit";
import { captureServer } from "@/lib/analytics";
import { getModelConfig } from "@/lib/modelConfig";
import {
  BackendUnavailableError,
  openBackendTurn,
  type BackendTurnEvent,
} from "@/lib/backendTurn";
import { createTiming, type Timing } from "@/lib/timing";
import type { ChatMessagesRow, ChatSessionsRow, RfqsRow } from "@/lib/supabase/types";
import type { BuyerProfile, ChatStreamEvent } from "@/types/chat";

// One AI turn is: interview (1-3 streamed Gemini rounds) + pills. The
// backend bounds the interview at 45 s and pills at ~10 s; the fetch
// timeout below sits under this ceiling so persistence always gets to run.
export const maxDuration = 60;
const BACKEND_TURN_TIMEOUT_MS = 57_000;

// Convert DB chat_messages rows into the {role, content} pairs the
// backend's Gemini history accepts. account_manager / system rows are
// frontend concerns and don't belong in the LLM history.
function toBackendHistory(rows: HistoryRow[]) {
  return rows
    .filter((r) => r.sender_type === "user" || r.sender_type === "ai")
    .map((r) => ({
      role: r.sender_type === "ai" ? ("model" as const) : ("user" as const),
      content: r.content,
    }));
}

interface ChatPostBody {
  session_id: string;
  message: string;
  // Client-generated idempotency key (crypto.randomUUID() per send,
  // reused verbatim on retry). Optional so older clients keep working;
  // without it a request is never deduped.
  client_message_id?: string;
}

/**
 * POST /api/chat: one buyer turn.
 *
 * Request flow (round trips in brackets):
 *   auth: getClaims, a local JWT check with asymmetric keys     [0-1]
 *   Stage A, parallel: rate limit, session, rfq, history, model cfg [1]
 *   Stage B: insert the user message (RLS client)               [1]
 *   backend /chat/stream (streamed)
 *   on reply_done: rfq update + AI insert, parallel             [1]
 *   after the stream closes: pills metadata + session language
 *
 * History is read BEFORE the user insert, so the new message is never
 * duplicated into the Gemini history and an empty history really means
 * "first turn" (drives the backend's returning-buyer note).
 *
 * Response: NDJSON stream (see ChatStreamEvent in types/chat.ts) when the
 * client sends `Accept: application/x-ndjson`; otherwise the same
 * pipeline aggregated into the legacy JSON shape. Outcomes decided before
 * the AI runs (400/404/429/5xx, ai_skipped, duplicate, ai_pending) are
 * always plain JSON.
 */
export async function POST(req: Request) {
  const t = createTiming();
  let body: ChatPostBody;
  try {
    body = (await req.json()) as ChatPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.session_id || !body.message?.trim()) {
    return NextResponse.json(
      { error: "session_id and non-empty message required" },
      { status: 400 },
    );
  }
  const clientMessageId =
    typeof body.client_message_id === "string" &&
    body.client_message_id.length > 0 &&
    body.client_message_id.length <= 64
      ? body.client_message_id
      : undefined;

  const auth = await getOrCreateUser();
  t.mark("auth");
  if (!auth) {
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }

  // ── Stage A: everything that doesn't depend on the insert, in parallel.
  // RLS scopes the session/rfq/history reads to the caller, so a foreign
  // session id just yields nulls / [] and the ownership check below 404s.
  const supabase = await getSupabaseServer();
  const [chatLimit, session, rfqRow, historyRows, modelCfg] = await Promise.all([
    // Per-user cap on Gemini turns (limit rationale in RATE_LIMITS).
    checkRateLimit(`chat:user:${auth.userId}`, RATE_LIMITS.chat),
    getSession(supabase, body.session_id),
    getRfq(supabase, body.session_id),
    listHistory(supabase, body.session_id),
    // Dashboard-driven live models (app_settings). null → the backend uses
    // its GEMINI_MODEL / GEMINI_PILLS_MODEL env defaults; never blocks.
    getModelConfig(),
  ]);
  t.mark("load");
  if (!chatLimit.allowed) return rateLimited429(chatLimit);
  if (!session || session.user_id !== auth.userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  // Post-handoff the AI is closed: the message is just a note for the AM.
  const aiTurn = session.status !== "in_handoff";
  if (aiTurn && !rfqRow) {
    return NextResponse.json({ error: "Missing rfq for session" }, { status: 500 });
  }

  const admin = getSupabaseAdmin();

  // ── Stage B: persist the user message under the buyer's RLS-scoped
  // client so `chat_messages_insert_user` enforces ownership. AI turns
  // are stamped turn=running so a failure can be retried (see claimTurn).
  let userMsg: ChatMessagesRow;
  let isRetry = false;
  try {
    userMsg = await insertMessage(supabase, {
      sessionId: session.id,
      senderType: "user",
      senderUserId: auth.userId,
      content: body.message,
      clientMessageId,
      metadata: aiTurn
        ? { turn: "running", turn_started_at: new Date().toISOString() }
        : undefined,
    });
  } catch (e) {
    // Idempotent replay: the unique index on (chat_session_id,
    // client_message_id) means this exact send already landed (a retry
    // after a client-side timeout or error, or a duplicate delivery).
    // Don't insert again.
    if (!(clientMessageId && isDuplicateMessageError(e))) {
      console.error("user message insert failed:", e);
      return NextResponse.json(
        { error: "Could not save your message" },
        { status: 500 },
      );
    }
    const existing = await findMessageByClientId(
      supabase,
      session.id,
      clientMessageId,
    );
    if (!existing) {
      // Conflict fired but the row isn't visible. Shouldn't happen (same
      // session, same RLS scope). Fail loudly rather than double-insert.
      console.error(
        "duplicate send detected but original row not found:",
        session.id,
        clientMessageId,
      );
      return NextResponse.json(
        { error: "Could not save your message" },
        { status: 500 },
      );
    }
    if (!aiTurn) {
      return NextResponse.json({
        reply: "",
        user_message: existing,
        agent_message: null,
        profile: null,
        profile_complete: true,
        review_requested: true,
        ai_skipped: true,
        duplicate: true,
      });
    }
    const aiReply = await findAiReplyFor(supabase, session.id, existing);
    if (aiReply) {
      // The original turn finished: hand its reply back.
      const replySuggestions = Array.isArray(
        (aiReply.metadata as { suggestions?: unknown })?.suggestions,
      )
        ? (aiReply.metadata as { suggestions: string[] }).suggestions
        : [];
      return NextResponse.json({
        reply: aiReply.content,
        user_message: existing,
        agent_message: aiReply,
        profile: rfqRow ? rfqRowToProfile(rfqRow) : null,
        profile_complete: rfqRow?.is_complete ?? false,
        review_requested: false,
        ai_skipped: false,
        duplicate: true,
        suggestions: replySuggestions,
      });
    }
    // No reply. Re-run the turn if the original FAILED, or has been
    // "running" so long its function must have died. Otherwise it's
    // genuinely still in flight: tell the client the send is safe and the
    // reply isn't ready (it renders a retryable notice).
    const { state, startedAt } = readTurnMeta(existing);
    const stale = Date.now() - Date.parse(startedAt) > STALE_TURN_MS;
    const claimed =
      state === "failed" || stale ? await claimTurn(admin, existing) : null;
    if (!claimed) {
      return NextResponse.json({
        reply: "",
        user_message: existing,
        agent_message: null,
        profile: rfqRow ? rfqRowToProfile(rfqRow) : null,
        profile_complete: rfqRow?.is_complete ?? false,
        review_requested: false,
        ai_skipped: false,
        duplicate: true,
        ai_pending: true,
      });
    }
    userMsg = claimed;
    isRetry = true;
  }
  t.mark("insert");

  if (!aiTurn) {
    return NextResponse.json(
      {
        reply: "",
        user_message: userMsg,
        agent_message: null,
        profile: null,
        profile_complete: true,
        review_requested: true,
        ai_skipped: true,
      },
      { headers: t.headers() },
    );
  }

  // Language handling: no separate detector on the chat turn. The session
  // stays on its 'en' default during the interview (Gemini mirrors the
  // buyer); the frontend localizes chat chrome per turn off the pills
  // pass's `reply_language`. We pin chat_sessions.language once the brief
  // completes (after the stream, below), reusing that reply_language, so
  // AM-side translation and the localized handoff messages have a target.
  // Whatever is stored is forwarded so a pinned language drives the
  // backend's OUTPUT LANGUAGE lock.
  const sessionLanguage = session.language ?? "en";

  const backendBody = {
    session_id: session.id,
    // Telemetry context only: lands in llm_call_logs.user_id and the
    // PostHog llm_call_completed event's distinct_id.
    user_id: auth.userId,
    message: userMsg.content,
    // Defensive filter: on a retry the claimed row already exists in the
    // history read above.
    history: toBackendHistory(historyRows.filter((r) => r.id !== userMsg.id)),
    profile: rfqRowToProfile(rfqRow as RfqsRow),
    language: sessionLanguage,
    ...(modelCfg.interviewModel && { model: modelCfg.interviewModel }),
    ...(modelCfg.pillsModel && { pills_model: modelCfg.pillsModel }),
    ...(modelCfg.pillsThinking && { pills_thinking: modelCfg.pillsThinking }),
  };

  let events: AsyncGenerator<BackendTurnEvent>;
  try {
    events = await openBackendTurn(backendBody, BACKEND_TURN_TIMEOUT_MS);
  } catch (e) {
    console.error(
      "backend call failed:",
      e instanceof BackendUnavailableError ? e.message : e,
    );
    await setTurnState(admin, userMsg, "failed");
    return NextResponse.json(
      { error: "AI service unavailable", user_message: userMsg },
      { status: 502, headers: t.headers() },
    );
  }
  t.mark("backend_connect");

  const ctx: TurnContext = {
    session,
    userMsg,
    rfqRow: rfqRow as RfqsRow,
    userId: auth.userId,
    clientMessageId,
    sessionLanguage,
    // Writes after the stream starts must not refresh the session cookie.
    // See getSupabaseWithAccessToken.
    writeClient: getSupabaseWithAccessToken(auth.accessToken),
    admin,
    timing: t,
    isRetry,
  };

  const wantsStream = (req.headers.get("accept") ?? "").includes(
    "application/x-ndjson",
  );

  if (!wantsStream) {
    // Legacy JSON clients (tabs opened before this deploy, or the
    // streaming flag off): same pipeline, aggregated.
    const result = await runTurn(events, ctx, { send: () => {}, close: () => {} });
    return NextResponse.json(result.json, {
      status: result.status,
      headers: t.headers(),
    });
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  let clientGone = false;
  let closed = false;
  const out: TurnOutput = {
    send(ev) {
      if (clientGone || closed) return;
      // Not awaited: the writer queues in order. A rejected write means the
      // browser went away; the turn still completes and persists (after()).
      writer
        .write(encoder.encode(`${JSON.stringify(ev)}\n`))
        .catch(() => {
          clientGone = true;
        });
    },
    close() {
      if (closed) return;
      closed = true;
      writer.close().catch(() => {});
    },
  };

  out.send({ type: "ack", user_message: userMsg });
  const pipeline = runTurn(events, ctx, out)
    .catch((e) => {
      console.error("chat pipeline crashed:", e);
      out.send({ type: "error", code: "internal", retryable: true });
      out.send({ type: "done" });
    })
    .finally(() => out.close());
  // Keep the function alive until the turn has fully persisted, even if
  // the buyer closes the tab mid-stream (Vercel waitUntil under the hood).
  after(() => pipeline);

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      ...t.headers(),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────

interface TurnContext {
  session: ChatSessionsRow;
  userMsg: ChatMessagesRow;
  rfqRow: RfqsRow;
  userId: string;
  clientMessageId: string | undefined;
  sessionLanguage: string;
  writeClient: ReturnType<typeof getSupabaseWithAccessToken>;
  admin: ReturnType<typeof getSupabaseAdmin>;
  timing: Timing;
  isRetry: boolean;
}

interface TurnOutput {
  send(ev: ChatStreamEvent): void;
  close(): void;
}

interface TurnResult {
  status: number;
  json: Record<string, unknown>;
}

/**
 * Consume the backend's event stream, forward it to the buyer, and
 * persist the outcome. Persistence order matters:
 *
 *  - The AI row is inserted (in parallel with the rfq update) BEFORE
 *    reply_done is forwarded. The client keeps the composer locked until
 *    reply_done, so the buyer's next turn can never read a history or
 *    rfq that's missing this turn.
 *  - Pills arrive after the reply. They're forwarded immediately, then
 *    merged into the AI row's metadata after the stream closes, so a
 *    refresh restores them.
 *  - A turn with no usable reply (backend error, empty text, truncated
 *    stream, or a failed AI insert) writes NO AI row and flips the user
 *    row to turn=failed, so Retry re-runs it.
 */
async function runTurn(
  events: AsyncGenerator<BackendTurnEvent>,
  ctx: TurnContext,
  out: TurnOutput,
): Promise<TurnResult> {
  const t = ctx.timing;
  let agentMsg: ChatMessagesRow | null = null;
  let updatedRfq: RfqsRow | null = null;
  let suggestions: string[] = [];
  let replyLanguage = "en";
  let errorCode: string | null = null;
  let firstDelta = true;

  try {
    for await (const ev of events) {
      if (ev.type === "delta") {
        if (agentMsg) continue;
        if (firstDelta) {
          firstDelta = false;
          t.mark("first_delta");
        }
        out.send({ type: "delta", text: ev.text });
      } else if (ev.type === "reply_done") {
        t.mark("generate");
        const reply = (ev.reply ?? "").trim();
        if (!reply) {
          // The model recorded fields but wrote no text, even after the
          // backend's nudge retry. Keep what the tool captured, then fail
          // the turn so Retry can re-run it (never persist a "" AI row).
          try {
            updatedRfq = await updateRfqFields(
              ctx.writeClient,
              ctx.session.id,
              profileToRfqUpdate(ev.profile),
            );
          } catch (e) {
            console.error("rfq update failed on empty reply:", e);
          }
          errorCode = "no_reply";
          break;
        }
        const [rfqRes, aiRes] = await Promise.allSettled([
          updateRfqFields(
            ctx.writeClient,
            ctx.session.id,
            profileToRfqUpdate(ev.profile),
          ),
          // AI messages bypass RLS (no auth.uid() match): admin client.
          // reply_to / client_message_id correlate this row to the buyer's
          // send: the duplicate path and the client's Realtime self-heal
          // both key on them.
          insertMessage(ctx.admin, {
            sessionId: ctx.session.id,
            senderType: "ai",
            content: reply,
            metadata: {
              reply_to: ctx.userMsg.id,
              ...(ctx.clientMessageId && {
                client_message_id: ctx.clientMessageId,
              }),
            },
          }),
        ]);
        if (aiRes.status === "rejected") {
          // Gemini succeeded but persistence failed. Log the reply so an
          // operator can replay it; the buyer gets a retryable error.
          console.error(
            "ai message insert failed for session",
            ctx.session.id,
            "reply that was generated but not saved:",
            reply,
            "error:",
            aiRes.reason,
          );
          errorCode = "save_failed";
          break;
        }
        agentMsg = aiRes.value;
        if (rfqRes.status === "fulfilled") {
          updatedRfq = rfqRes.value;
        } else {
          // Non-fatal for the buyer (the reply is saved), but this turn's
          // captured fields are lost. Loud so it's noticed.
          console.error("rfq update failed:", rfqRes.reason);
        }
        const profileRow = updatedRfq ?? ctx.rfqRow;
        out.send({
          type: "reply_done",
          agent_message: agentMsg,
          // Same runtime shape; ProfileShape types the enums as plain strings.
          profile: rfqRowToProfile(profileRow) as unknown as BuyerProfile,
          profile_complete: profileRow.is_complete,
        });
        t.mark("persist");
        // The funnel step before review_requested: fires once per session,
        // on the turn where the last required field lands.
        if (!ctx.rfqRow.is_complete && updatedRfq?.is_complete) {
          captureServer(ctx.userId, "profile_completed", {
            session_id: ctx.session.id,
          });
        }
      } else if (ev.type === "pills") {
        suggestions = Array.isArray(ev.suggestions) ? ev.suggestions : [];
        replyLanguage =
          typeof ev.reply_language === "string" ? ev.reply_language : "en";
        if (agentMsg) {
          t.mark("pills");
          out.send({
            type: "pills",
            suggestions,
            reply_language: replyLanguage,
          });
        }
      } else if (ev.type === "error") {
        // Only meaningful before the reply exists; after reply_done the
        // turn already succeeded.
        if (!agentMsg) {
          errorCode = ev.code || "interview_failed";
          break;
        }
      } else if (ev.type === "done") {
        break;
      }
    }
  } catch (e) {
    console.error("backend stream failed:", e);
    if (!agentMsg) errorCode = errorCode ?? "stream_failed";
  }

  if (!agentMsg) {
    const code = errorCode ?? "truncated";
    await setTurnState(ctx.admin, ctx.userMsg, "failed");
    out.send({ type: "error", code, retryable: true });
    out.send({ type: "done", timings: t.stages() });
    out.close();
    t.log("chat_turn_timing", {
      session_id: ctx.session.id,
      ok: false,
      code,
      retry: ctx.isRetry,
    });
    if (code === "no_reply") {
      // Legacy JSON shape for "200 but no reply": the client renders its
      // errNoReply bubble with a Retry button.
      return {
        status: 200,
        json: {
          reply: "",
          user_message: ctx.userMsg,
          agent_message: null,
          profile: rfqRowToProfile(updatedRfq ?? ctx.rfqRow),
          profile_complete: (updatedRfq ?? ctx.rfqRow).is_complete,
          review_requested: false,
          ai_skipped: false,
        },
      };
    }
    return {
      status: 502,
      json: { error: "AI service unavailable", user_message: ctx.userMsg },
    };
  }

  out.send({ type: "done", timings: t.stages() });
  out.close();

  // ── After the buyer's stream is closed (after() keeps us alive). ──
  const profileRow = updatedRfq ?? ctx.rfqRow;
  const pinLanguage =
    profileRow.is_complete &&
    ctx.sessionLanguage === "en" &&
    replyLanguage !== "en";
  await Promise.allSettled([
    // Quick-reply pills are stored on the AI row (not just streamed) so
    // they survive a session switch or refresh. See the `suggestions`
    // comment on the Message type in types/chat.ts.
    suggestions.length > 0
      ? mergeMessageMetadata(ctx.admin, agentMsg, { suggestions })
      : null,
    // Pin the buyer's language once the brief first completes, so
    // AM-side translation and the localized handoff messages have a
    // target. Reuses the pills pass's classification (no extra call).
    // Non-fatal: the AM-send route has its own fallback.
    pinLanguage
      ? setSessionLanguage(ctx.writeClient, ctx.session.id, replyLanguage).catch(
          (e) => console.error("session language persist failed:", e),
        )
      : null,
    // Whatever the language (English included), it's now known: the
    // AM-send route skips its own detection from here on (migration 0023).
    profileRow.is_complete && !ctx.session.language_resolved_at
      ? markSessionLanguageResolved(ctx.writeClient, ctx.session.id)
      : null,
  ]);
  t.log("chat_turn_timing", {
    session_id: ctx.session.id,
    ok: true,
    retry: ctx.isRetry,
  });

  return {
    status: 200,
    json: {
      reply: agentMsg.content,
      user_message: ctx.userMsg,
      agent_message:
        suggestions.length > 0
          ? { ...agentMsg, metadata: { ...agentMsg.metadata, suggestions } }
          : agentMsg,
      profile: rfqRowToProfile(profileRow),
      profile_complete: profileRow.is_complete,
      review_requested: false,
      ai_skipped: false,
      // ISO 639-1 language of the agent's reply (from the pills pass). The
      // client adopts it as the buyer's display language.
      reply_language: replyLanguage,
      suggestions,
    },
  };
}
