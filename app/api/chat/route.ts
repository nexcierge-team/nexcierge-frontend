import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession, setSessionLanguage } from "@/lib/db/sessions";
import { insertMessage, listMessages } from "@/lib/db/messages";
import {
  getRfq,
  profileToRfqUpdate,
  rfqRowToProfile,
  updateRfqFields,
} from "@/lib/db/rfqs";
import { checkRateLimit, RATE_LIMITS, rateLimited429 } from "@/lib/rateLimit";
import { captureServer } from "@/lib/analytics";
import { getModelConfig } from "@/lib/modelConfig";
import type { ChatMessagesRow } from "@/lib/supabase/types";
import { BACKEND_URL, backendHeaders } from "@/lib/backend";

// Convert DB chat_messages rows into the {role, content} pairs the
// backend's Gemini history accepts. account_manager / system rows are
// frontend concerns and don't belong in the LLM history.
function toBackendHistory(rows: ChatMessagesRow[]) {
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
}

export async function POST(req: Request) {
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

  const auth = await getOrCreateUser();
  if (!auth) {
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }

  // Per-user cap on Gemini turns (limit rationale in RATE_LIMITS).
  const chatLimit = await checkRateLimit(
    `chat:user:${auth.userId}`,
    RATE_LIMITS.chat,
  );
  if (!chatLimit.allowed) return rateLimited429(chatLimit);

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, body.session_id);
  if (!session || session.user_id !== auth.userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Persist the user message under the buyer's RLS-scoped client so
  // the policy `chat_messages_insert_user` enforces ownership.
  let userMsg: ChatMessagesRow;
  try {
    userMsg = await insertMessage(supabase, {
      sessionId: session.id,
      senderType: "user",
      senderUserId: auth.userId,
      content: body.message,
    });
  } catch (e) {
    console.error("user message insert failed:", e);
    return NextResponse.json(
      { error: "Could not save your message" },
      { status: 500 },
    );
  }

  // Post-handoff: the AI is closed. Drop the message into the
  // transcript as a note for the account manager and return.
  if (session.status === "in_handoff") {
    return NextResponse.json({
      reply: "",
      user_message: userMsg,
      agent_message: null,
      profile: null,
      profile_complete: true,
      review_requested: true,
      ai_skipped: true,
    });
  }

  // AI turn: load history + rfq, hand off to FastAPI, persist reply.
  const [historyRows, rfqRow] = await Promise.all([
    listMessages(supabase, session.id),
    getRfq(supabase, session.id),
  ]);
  if (!rfqRow) {
    return NextResponse.json({ error: "Missing rfq for session" }, { status: 500 });
  }

  // Language handling: we don't run a separate detector on the chat turn.
  // The session stays on its 'en' default during the interview (Gemini
  // mirrors the buyer); the frontend localizes chat chrome per-turn off the
  // pills pass's `reply_language` (returned below). We pin
  // chat_sessions.language once the brief completes (further down), reusing
  // that same reply_language, so AM-side translation + the localized handoff
  // messages have a target; the AM-send route keeps its own fallback. We
  // forward whatever is stored so a pinned language drives the backend's
  // OUTPUT LANGUAGE lock.
  const sessionLanguage = session.language ?? "en";

  // Dashboard-driven live models (app_settings). null → the backend uses its
  // GEMINI_MODEL / GEMINI_PILLS_MODEL env defaults; never blocks a turn.
  const modelCfg = await getModelConfig();

  const backendBody = {
    session_id: session.id,
    // Telemetry context only — lands in llm_call_logs.user_id and the
    // PostHog llm_call_completed event's distinct_id.
    user_id: auth.userId,
    message: body.message,
    history: toBackendHistory(historyRows),
    profile: rfqRowToProfile(rfqRow),
    language: sessionLanguage,
    ...(modelCfg.interviewModel && { model: modelCfg.interviewModel }),
    ...(modelCfg.pillsModel && { pills_model: modelCfg.pillsModel }),
    ...(modelCfg.pillsThinking && { pills_thinking: modelCfg.pillsThinking }),
  };

  let backendData: {
    reply: string;
    profile: ReturnType<typeof rfqRowToProfile>;
    profile_complete: boolean;
    suggestions?: string[];
    reply_language?: string;
  };
  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: backendHeaders(),
      body: JSON.stringify(backendBody),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    backendData = await res.json();
  } catch (e) {
    console.error("backend call failed:", e);
    return NextResponse.json(
      { error: "AI service unavailable", user_message: userMsg },
      { status: 502 },
    );
  }

  const updatedRfq = await updateRfqFields(
    supabase,
    session.id,
    profileToRfqUpdate(backendData.profile),
  );

  // The funnel step before review_requested: fires once per session, on the
  // turn where the last required field lands (rfqRow is the pre-turn state).
  if (!rfqRow.is_complete && updatedRfq.is_complete) {
    captureServer(auth.userId, "profile_completed", {
      session_id: session.id,
    });
  }

  // Quick-reply pills from the pills pass. Stored on the message row
  // (not just returned in the response) so they survive a session
  // switch or refresh — see the `suggestions` comment on the Message
  // type in types/chat.ts for how the read side restores them.
  const suggestions = Array.isArray(backendData.suggestions)
    ? backendData.suggestions
    : [];

  // AI messages bypass RLS (no auth.uid() match) — admin client.
  const admin = getSupabaseAdmin();
  let agentMsg: ChatMessagesRow;
  try {
    agentMsg = await insertMessage(admin, {
      sessionId: session.id,
      senderType: "ai",
      content: backendData.reply,
      metadata: suggestions.length > 0 ? { suggestions } : undefined,
    });
  } catch (e) {
    // Gemini succeeded but persistence failed. Log the reply text so an
    // operator can manually replay it into chat_messages if recovery is
    // needed — otherwise the buyer's chat shows the typing dots followed
    // by an error and the AI's answer is lost.
    console.error(
      "ai message insert failed for session",
      session.id,
      "— reply that was generated but not saved:",
      backendData.reply,
      "error:",
      e,
    );
    return NextResponse.json(
      { error: "Reply generated but could not be saved", user_message: userMsg },
      { status: 500 },
    );
  }

  // Pin the buyer's language once the brief first completes, so AM-side
  // translation and the localized handoff messages have a target. We reuse
  // the language the pills pass already classified for this reply — no extra
  // classifier call. Skipped once a non-'en' language is pinned; an English
  // (or undetected) reply leaves it 'en', and the AM-send route still has
  // its own fallback.
  const replyLanguage = backendData.reply_language ?? "en";
  if (updatedRfq.is_complete && sessionLanguage === "en" && replyLanguage !== "en") {
    try {
      await setSessionLanguage(supabase, session.id, replyLanguage);
    } catch (e) {
      // Non-fatal: the AM-send fallback pins it later.
      console.error("session language persist failed:", e);
    }
  }

  return NextResponse.json({
    reply: backendData.reply,
    user_message: userMsg,
    agent_message: agentMsg,
    profile: rfqRowToProfile(updatedRfq),
    profile_complete: updatedRfq.is_complete,
    review_requested: false,
    ai_skipped: false,
    // ISO 639-1 language of the agent's reply (from the pills pass). The
    // client adopts it as the buyer's display language to localize chat
    // chrome + the summary card from the first turn.
    reply_language: replyLanguage,
    // Also persisted on agent_message.metadata.suggestions (see above) so
    // a session switch or refresh restores them via rowToMessage — this
    // copy just saves the client a round-trip on the turn that produced
    // them.
    suggestions,
  });
}
