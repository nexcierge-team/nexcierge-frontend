"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { useRealtimeChat } from "@/lib/useRealtimeChat";
import { chatStrings } from "@/lib/chatStrings";
import { readNdjson } from "@/lib/ndjson";
import { useStableCallback } from "@/lib/useStableCallback";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  bootstrapUrlForSession,
  fetchBootstrap,
  forgetBootstrap,
  peekBootstrap,
  primeBootstrap,
  type BootstrapPayload,
} from "@/lib/chatBootstrap";
import type {
  BuyerProfile,
  ChatRole,
  ChatStreamEvent,
  Message,
  MessageFrom,
} from "@/types/chat";
import type {
  ChatMessagesRow,
  ChatSenderType,
  ChatSessionStatus,
} from "@/lib/supabase/types";
import type {
  SourcingStage,
  SourcingStageHistory,
} from "@/lib/sourcingStages";
import { attachmentsFromMetadata } from "@/lib/attachments";

// Local (never-persisted) bubble ids. Prefixed so they can never be
// mistaken for a DB row id.
function newMessageId() {
  return `local:${newClientMessageId()}`;
}

// Free-preview allowance for anonymous (not-signed-in) buyers. After sending
// this many messages, a signup gate blocks further chatting until they link
// an identity (Google / magic link). Signed-in buyers are never gated. The
// count is buyer turns only — AI replies don't consume the allowance.
const FREE_MESSAGE_LIMIT = 3;

// Streamed replies (NDJSON from POST /api/chat). Rollout flag: when off,
// the route returns the classic single JSON reply. See docs/ARCHITECTURE.md.
const STREAMING = process.env.NEXT_PUBLIC_CHAT_STREAMING === "1";

// Watchdogs for a streamed turn. They replace the old flat 30 s abort: a
// streamed turn can legitimately run longer as long as bytes keep arriving.
// The server keeps working after an abort (after()), so Retry picks up the
// finished reply or re-runs a failed turn.
const ACK_TIMEOUT_MS = 15_000; // request accepted (headers + ack)
const IDLE_TIMEOUT_MS = 20_000; // max silence between chunks
const TOTAL_TIMEOUT_MS = 60_000; // whole turn

// Idempotency key sent as client_message_id on POST /api/chat. One per
// send; retry() reuses the failed send's key so a timed-out request
// that actually landed server-side isn't inserted (or answered) twice.
function newClientMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function streamBubbleId(clientId: string) {
  return `stream:${clientId}`;
}

// Quick-reply pills, written into metadata.suggestions on the AI row
// (app/api/chat/route.ts) so they survive a session switch or refresh.
// Rendering only ever shows pills on the LAST message in the array (see
// app/chat/page.tsx), so restoring this on every agent message is safe —
// once the buyer replies, a newer message becomes "last" and these stop
// rendering with no extra invalidation needed.
function suggestionsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string[] | undefined {
  const raw = (metadata as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out = raw.filter((s): s is string => typeof s === "string");
  return out.length > 0 ? out : undefined;
}

function clientIdFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | undefined {
  const raw = (metadata as { client_message_id?: unknown } | null)
    ?.client_message_id;
  return typeof raw === "string" && raw ? raw : undefined;
}

// Mirrors the backend's pre-handoff follow-ups check (`_profile_state_note`
// in backend/app/chatbot.py): after the required fields complete, the agent
// still asks about technical specs, facility power supply, and compliance —
// optional fields that never gate handoff but must be ASKED. While any is
// pending, the agent's reply is a question, so attaching the "brief is
// ready" card to it reads as a premature close (and buries the question's
// quick-reply pills). We hold the card back until the follow-ups are
// captured — the backend's "unsure" fallbacks store non-empty sentinel
// values, so an unsure buyer still converges in one ask per field.
function followupsPending(profile: BuyerProfile): boolean {
  const pr = profile.purchase_request;
  if (
    pr.machine_type &&
    Object.keys(pr.technical_specifications ?? {}).length === 0
  ) {
    return true;
  }
  if (
    pr.delivery_country &&
    (!pr.electrical_requirements || pr.compliance_requirements.length === 0)
  ) {
    return true;
  }
  return false;
}

// Question marks (ASCII / fullwidth / Arabic) cover how every supported
// language writes a question.
const QUESTION_RE = /[?？؟]/;

// Translate a DB chat_messages row into the UI's Message shape.
function rowToMessage(row: ChatMessagesRow): Message {
  const senderRoleMap: Record<ChatSenderType, ChatRole> = {
    user: "user",
    ai: "agent",
    account_manager: "agent",
    system: "divider", // system rows currently carry the divider label
  };
  const from: MessageFrom | undefined =
    row.sender_type === "account_manager" ? "account_manager" : undefined;
  return {
    id: row.id,
    role: senderRoleMap[row.sender_type],
    content: row.content,
    from,
    translatedContent: row.translated_content,
    translatedTo: row.translated_to,
    readAt: row.read_at,
    attachments: attachmentsFromMetadata(row.metadata),
    suggestions: suggestionsFromMetadata(row.metadata),
    clientId:
      row.sender_type === "ai"
        ? clientIdFromMetadata(row.metadata)
        : (row.client_message_id ?? undefined),
  };
}

interface BootstrapState {
  sessionId: string;
  userId: string;
  isAnonymous: boolean;
  profile: BuyerProfile;
  profileComplete: boolean;
  reviewRequested: boolean;
  language: string;
  // Session metadata for the progress rail. /api/chat/start returns all
  // of these; realtime UPDATEs on the active session override them at
  // the page level (see app/chat/page.tsx activeRow).
  status: ChatSessionStatus;
  title: string | null;
  handoffRequestedAt: string | null;
  sourcingStage: SourcingStage | null;
  sourcingStageHistory: SourcingStageHistory;
}

// Sidebar list delivered with a bootstrap payload (see useSessionsList).
export interface SessionsSeed {
  userId: string;
  sessions: NonNullable<BootstrapPayload["sessions"]>;
}

// idle: nothing in flight. waiting: request sent, no reply text yet
// (typing dots). streaming: reply text is arriving (no dots; the growing
// bubble is the indicator). The composer is locked unless idle.
type Phase = "idle" | "waiting" | "streaming";

interface PendingSend {
  text: string;
  clientId: string;
}

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

class StreamTurnError extends Error {
  constructor(public code: string) {
    super(`stream error: ${code}`);
  }
}

/**
 * Hydrated, DB-backed chat hook.
 *
 * On mount: GET /api/chat/start → bootstraps Supabase session (anon if
 * needed), loads or creates the active chat_session, returns full
 * history + rfq + the sidebar list. Session switches render a cached
 * payload instantly (lib/chatBootstrap.ts) and revalidate in the
 * background.
 *
 * Per turn: POST /api/chat. With streaming on, the reply arrives as
 * NDJSON events (ack → delta* → reply_done → pills → done) and renders as
 * it's generated; otherwise as one JSON body. Realtime delivers AI rows
 * too, correlated by client_message_id, which heals a turn whose stream
 * dropped after the server had already saved the reply.
 *
 * Per handoff: POST /api/request-review → server flips status to
 * in_handoff, inserts AI close + divider + AM welcome, returns them.
 */
interface UseChatOptions {
  // Pass true to force /api/chat/start to create a brand-new chat_session
  // (skipping the active-session lookup). Used by the marketing homepage
  // chat preview / FAB so every open lands on a blank slate.
  forceNew?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const { forceNew = false } = options;
  const auth = useAuthContext();
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sessionsSeed, setSessionsSeed] = useState<SessionsSeed | null>(null);
  // Drives which session we bootstrap. Initialised from ?session_id=<id>;
  // mutated by switchSession() so the sidebar can swap conversations
  // in-place (no full page reload, no empty-state flash).
  const [targetSessionId, setTargetSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("session_id");
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  // Open AuthModal when /api/request-review returns 401 + auth_required.
  // The chat page renders the modal; we just signal here.
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  // Guest signup gate: opens once an anonymous buyer exhausts their free
  // preview (FREE_MESSAGE_LIMIT). Same AuthModal, different copy — see the
  // chat page. Separate from authPromptOpen so the handoff gate and the
  // message gate can't clobber each other's open state.
  const [signupGateOpen, setSignupGateOpen] = useState(false);
  // Text + idempotency key of the last send, kept for retry().
  const [lastUserMessage, setLastUserMessage] = useState<PendingSend | null>(
    null,
  );

  // Snapshot of the profile we last rendered as a card. Re-attach the
  // card on any subsequent reply where the profile content changed.
  const lastAttachedProfileRef = useRef<string | null>(null);
  // DB message ids already rendered, so Realtime echoes don't double-render.
  const seenIds = useRef<Set<string>>(new Set());
  // client_message_id of the turn whose stream currently owns its AI row.
  const inflightClientIdRef = useRef<string | null>(null);
  // An AI row Realtime delivered for the in-flight turn (ignored while the
  // stream owns it). Used as the reply if the stream then fails.
  const stashedAiRowRef = useRef<ChatMessagesRow | null>(null);
  // The latest turn. Phase changes from an older, still-finishing turn
  // (e.g. its pills tail) must not clobber a newer turn's state.
  const activeTurnRef = useRef<string | null>(null);
  // A send typed while the session was still bootstrapping. Flushed once
  // the session exists. Its optimistic bubble carries the same clientId.
  const pendingSendRef = useRef<PendingSend | null>(null);
  // Streamed text buffer + one requestAnimationFrame flush per frame.
  const streamRef = useRef<{ clientId: string; text: string } | null>(null);
  const rafRef = useRef(0);

  const sessionId = bootstrap?.sessionId ?? null;
  const reviewRequested = bootstrap?.reviewRequested ?? false;
  const loading = phase !== "idle";

  // Guest signup gate. Anonymous buyers get FREE_MESSAGE_LIMIT free turns;
  // past that we block sending until they sign in. Count is buyer turns only
  // (role === "user"), which includes the optimistic bubble already on
  // screen. `isAnonymous` defaults to true until bootstrap resolves so we
  // never leak free turns during the initial load. reviewRequested implies a
  // signed-in buyer (handoff is auth-gated), so it can't coincide, but the
  // guard keeps the two states independent.
  const isAnonymous = bootstrap?.isAnonymous ?? true;
  const userMessageCount = messages.reduce(
    (n, m) => (m.role === "user" ? n + 1 : n),
    0,
  );
  const signupRequired =
    isAnonymous && !reviewRequested && userMessageCount >= FREE_MESSAGE_LIMIT;

  // ── Bootstrap ───────────────────────────────────────────────────────

  // Turn a bootstrap payload into hook state. Used for network results,
  // cached payloads (instant session switch) and primed payloads.
  const applyBootstrap = useStableCallback((data: BootstrapPayload) => {
    // Fresh dedup tracker per session — Realtime ids from the old
    // chat_session_id channel must not bleed into the new one.
    seenIds.current = new Set<string>();
    const initialMessages = (data.messages as ChatMessagesRow[]).map(
      rowToMessage,
    );
    initialMessages.forEach((m) => seenIds.current.add(m.id));
    const profile = data.profile as BuyerProfile;
    // Attach the profile card to the last AI message (NOT an
    // account-manager message — those happen post-handoff and the
    // card would visually jump around as the AM types). Pre-handoff
    // this is the most recent AI reply; post-handoff this is the
    // hard-coded HANDOFF_REPLY close. Either way, it's a stable
    // anchor that doesn't move as the conversation continues.
    // Hold the card back while pre-handoff follow-ups are still being
    // asked — unless review was already requested (legacy sessions that
    // handed off before follow-ups existed must keep their card), or the
    // last AI reply asks nothing (the agent already closed — possibly
    // early, despite pending follow-ups; same safety valve as the live
    // path, so a reload reproduces what the buyer saw).
    let attached = false;
    const lastAi = [...initialMessages]
      .reverse()
      .find((m) => m.role === "agent" && !m.from);
    const bootstrapCardReady =
      data.review_requested ||
      !followupsPending(profile) ||
      (lastAi ? !QUESTION_RE.test(lastAi.content) : false);
    if (data.profile_complete && bootstrapCardReady && initialMessages.length > 0) {
      for (let i = initialMessages.length - 1; i >= 0; i--) {
        const m = initialMessages[i];
        if (m.role === "agent" && !m.from) {
          initialMessages[i] = { ...m, profileCard: profile };
          attached = true;
          break;
        }
      }
    }
    lastAttachedProfileRef.current = attached ? JSON.stringify(profile) : null;
    // A send typed during bootstrap keeps its optimistic bubble on screen.
    const pending = pendingSendRef.current;
    if (pending) {
      initialMessages.push({
        id: newMessageId(),
        role: "user",
        content: pending.text,
        clientId: pending.clientId,
      });
    }
    setLastUserMessage(null);
    setMessages(initialMessages);
    setBootstrap({
      sessionId: data.session.id,
      userId: data.user.id,
      isAnonymous: data.user.is_anonymous,
      profile,
      profileComplete: data.profile_complete,
      reviewRequested: data.review_requested,
      language: data.session.language ?? "en",
      status: (data.session.status as ChatSessionStatus) ?? "ai",
      title: data.session.title ?? null,
      handoffRequestedAt: data.session.handoff_requested_at ?? null,
      sourcingStage: (data.session.sourcing_stage as SourcingStage | null) ?? null,
      sourcingStageHistory:
        (data.session.sourcing_stage_history as SourcingStageHistory) ?? {},
    });
    if (data.sessions) {
      setSessionsSeed({ userId: data.user.id, sessions: data.sessions });
    }
    // Cache under the session's own key so switching back is instant.
    primeBootstrap(data.session.id, data);
  });

  // First visit: /api/chat/start just set the auth cookie server-side.
  // The browser auth client doesn't emit an event for that, so re-read
  // the session; the sidebar's Realtime subscription keys on the user id.
  const bootstrapUserId = bootstrap?.userId ?? null;
  const authUserId = auth.user?.id ?? null;
  const authLoading = auth.loading;
  const refreshAuth = auth.refresh;
  useEffect(() => {
    if (!bootstrapUserId || authLoading) return;
    if (authUserId !== bootstrapUserId) void refreshAuth();
  }, [bootstrapUserId, authUserId, authLoading, refreshAuth]);

  // Re-fires whenever `targetSessionId` changes. We DON'T clear
  // `messages` here — the previous session's bubbles stay on screen
  // until the new data arrives, which avoids the empty-state flash.
  useEffect(() => {
    let cancelled = false;
    const url = targetSessionId
      ? bootstrapUrlForSession(targetSessionId)
      : forceNew
        ? "/api/chat/start?new=1"
        : "/api/chat/start";
    const { data: cached, inflight, fresh } = peekBootstrap(url);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the error for a new bootstrap target
    setBootstrapError(null);
    if (cached) {
      // Instant render from cache; revalidate below unless fresh.
      applyBootstrap(cached);
      setBootstrapping(false);
      if (fresh) return;
    } else {
      setBootstrapping(true);
    }
    (inflight ?? fetchBootstrap(url))
      .then((data) => {
        if (cancelled) return;
        // A revalidation must not wipe a turn the buyer started from the
        // cached view; Realtime keeps that view current anyway.
        if (cached && (activeTurnRef.current || pendingSendRef.current)) return;
        applyBootstrap(data);
      })
      .catch((e) => {
        if (cancelled || cached) return;
        console.error("chat bootstrap failed:", e);
        setBootstrapError(
          "Couldn't start a chat session. Refresh to try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetSessionId, forceNew, applyBootstrap]);

  // Browser back/forward keeps the URL and our state in sync — popstate
  // fires when the user navigates history without a page load. We mirror
  // ?session_id=<id> into targetSessionId so the bootstrap effect re-runs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPop() {
      const id = new URLSearchParams(window.location.search).get("session_id");
      setTargetSessionId(id);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // In-place session swap used by the sidebar. Updates the URL via
  // pushState (so refresh + back-button still work) and triggers the
  // bootstrap effect above. No full page reload, no welcome-screen flash.
  const switchSession = useStableCallback((id: string | null) => {
    if (typeof window !== "undefined") {
      const url = id ? `/chat?session_id=${encodeURIComponent(id)}` : "/chat";
      if (window.location.pathname + window.location.search !== url) {
        window.history.pushState({}, "", url);
      }
    }
    // The conversation we're leaving changed locally since it was cached;
    // drop it so switching back shows current data, not a stale snapshot.
    if (sessionId && sessionId !== id) forgetBootstrap(sessionId);
    pendingSendRef.current = null;
    setTargetSessionId(id);
  });

  // ── Message list helpers ────────────────────────────────────────────

  const appendError = useStableCallback(
    (content: string, clientId?: string) => {
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "agent", content, error: true, clientId },
      ]);
    },
  );

  function cancelStreamFlush() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }

  // Buffer a streamed chunk; paint at most once per animation frame.
  const appendDelta = (clientId: string, text: string) => {
    const cur = streamRef.current;
    streamRef.current =
      cur && cur.clientId === clientId
        ? { clientId, text: cur.text + text }
        : { clientId, text };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const s = streamRef.current;
      if (!s) return;
      const id = streamBubbleId(s.clientId);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) {
          return [
            ...prev,
            {
              id,
              role: "agent",
              content: s.text,
              streaming: true,
              clientId: s.clientId,
            },
          ];
        }
        const next = prev.slice();
        next[idx] = { ...next[idx], content: s.text };
        return next;
      });
    });
  };

  const dropStreamBubble = (clientId: string) => {
    cancelStreamFlush();
    if (streamRef.current?.clientId === clientId) streamRef.current = null;
    const id = streamBubbleId(clientId);
    setMessages((prev) =>
      prev.some((m) => m.id === id) ? prev.filter((m) => m.id !== id) : prev,
    );
  };

  // Adopt the reply's language (reported by the backend every turn) as
  // the buyer's display language — this drives chat chrome + the
  // summary card from the first turn. Only upgrade to a confident
  // non-'en' code, then stick with it: don't flip back to 'en' on a
  // later short/ambiguous reply. Post-handoff AM replies adopt the
  // language via handleInsert instead.
  const adoptLanguage = (replyLanguage: string | null | undefined) => {
    if (!replyLanguage || replyLanguage === "en") return;
    setBootstrap((prev) =>
      prev && prev.language !== replyLanguage
        ? { ...prev, language: replyLanguage }
        : prev,
    );
  };

  // Render a saved AI reply (from reply_done, a JSON reply, or a healed
  // Realtime row), replacing the streaming bubble for the same turn if
  // there is one.
  const applyAgentReply = (args: {
    row: ChatMessagesRow;
    clientId: string;
    profile?: BuyerProfile | null;
    profileComplete?: boolean;
    suggestions?: string[];
  }) => {
    const { row, clientId, profile } = args;
    const nowComplete = Boolean(args.profileComplete);
    const profileSnapshot = profile ? JSON.stringify(profile) : null;
    // Safety valve: if the model delivered a closing line (a reply that
    // asks nothing) despite pending follow-ups, still show the card —
    // "your brief is ready below" pointing at nothing is a dead-end.
    const attachCard =
      Boolean(profile) &&
      nowComplete &&
      // Not while the agent is still asking the pre-handoff follow-ups
      // (specs / power / compliance) — the card marks the actual close.
      (reviewRequested ||
        !followupsPending(profile as BuyerProfile) ||
        !QUESTION_RE.test(row.content)) &&
      profileSnapshot !== lastAttachedProfileRef.current;
    if (attachCard) lastAttachedProfileRef.current = profileSnapshot;
    seenIds.current.add(row.id);

    cancelStreamFlush();
    if (streamRef.current?.clientId === clientId) streamRef.current = null;
    const streamId = streamBubbleId(clientId);
    const base = rowToMessage(row);
    const suggestions =
      args.suggestions && args.suggestions.length > 0
        ? args.suggestions
        : base.suggestions;
    const msg: Message = {
      ...base,
      clientId,
      profileCard: attachCard ? (profile as BuyerProfile) : undefined,
      suggestions,
    };
    setMessages((prev) => {
      const withoutStream = prev.filter((m) => m.id !== streamId);
      const streamIdx = prev.findIndex((m) => m.id === streamId);
      if (withoutStream.some((m) => m.id === row.id)) return withoutStream;
      if (streamIdx === -1) return [...withoutStream, msg];
      const next = prev.slice();
      next[streamIdx] = msg;
      return next;
    });
    if (profile) {
      setBootstrap((prev) =>
        prev ? { ...prev, profile, profileComplete: nowComplete } : prev,
      );
    }
  };

  const setPhaseFor = (clientId: string, next: Phase) => {
    if (activeTurnRef.current === clientId) setPhase(next);
  };

  // ── Realtime ────────────────────────────────────────────────────────
  // Deduped INSERT + UPDATE handlers + typing presence. Delegated to
  // useRealtimeChat so the same logic powers both buyer and AM views.
  const myUserId = bootstrap?.userId ?? null;
  const handleInsert = useCallback((row: ChatMessagesRow) => {
    if (row.sender_type === "ai") {
      const cid = clientIdFromMetadata(row.metadata);
      // The in-flight stream owns this row; keep it in case the stream
      // fails before delivering reply_done.
      if (cid && cid === inflightClientIdRef.current) {
        stashedAiRowRef.current = row;
        return;
      }
      if (seenIds.current.has(row.id)) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        const msg = rowToMessage(row);
        if (cid) {
          // Self-heal: the reply to a send whose stream dropped replaces
          // that turn's error bubble.
          const errIdx = prev.findIndex((m) => m.error && m.clientId === cid);
          if (errIdx >= 0) {
            const next = prev.slice();
            next[errIdx] = msg;
            return next;
          }
          // A reply to a message sent from ANOTHER tab: this tab never saw
          // the question (own user rows are filtered), so don't show an
          // orphaned answer.
          if (!prev.some((m) => m.clientId === cid)) return prev;
        }
        return [...prev, msg];
      });
      seenIds.current.add(row.id);
      return;
    }
    if (seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);
    setMessages((prev) => [...prev, rowToMessage(row)]);
    // The buyer's session language is resolved lazily on the AM side
    // (the first AM reply detects it from the thread), so an incoming AM
    // message may be the first time this client learns the real language.
    // Adopt the message's `translated_to` so MessageBubble renders the
    // localisation — it only shows translated_content when
    // translated_to === sessionLanguage.
    if (
      row.sender_type === "account_manager" &&
      row.translated_to &&
      row.translated_to !== "en"
    ) {
      const lang = row.translated_to;
      setBootstrap((prev) =>
        prev && prev.language !== lang ? { ...prev, language: lang } : prev,
      );
    }
  }, []);
  const handleUpdate = useCallback((row: ChatMessagesRow) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === row.id
          ? {
              ...m,
              readAt: row.read_at,
              // Pills merged into an AI row after its reply streamed.
              suggestions: suggestionsFromMetadata(row.metadata) ?? m.suggestions,
            }
          : m,
      ),
    );
  }, []);
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useRealtimeChat({
    sessionId,
    myUserId,
    myRole: "buyer",
    onMessageInsert: handleInsert,
    onMessageUpdate: handleUpdate,
    includeAi: true,
  });

  // ── One turn ────────────────────────────────────────────────────────

  const runTurn = useStableCallback(
    async (
      text: string,
      clientId: string,
      sid: string,
      expectAi: boolean,
    ): Promise<void> => {
      const strings = chatStrings(bootstrap?.language);
      if (expectAi) {
        activeTurnRef.current = clientId;
        inflightClientIdRef.current = clientId;
        stashedAiRowRef.current = null;
        setPhase("waiting");
      }
      performance.mark?.("chat:send");

      const controller = new AbortController();
      const startedAt = Date.now();
      let lastChunkAt = startedAt;
      let accepted = false;
      let replyDone = false;
      let streamed = false;
      const watchdog = setInterval(() => {
        const now = Date.now();
        if (
          now - startedAt > TOTAL_TIMEOUT_MS ||
          (streamed && !replyDone && now - lastChunkAt > IDLE_TIMEOUT_MS) ||
          (STREAMING && !accepted && now - startedAt > ACK_TIMEOUT_MS)
        ) {
          controller.abort();
        }
      }, 1000);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(STREAMING && { Accept: "application/x-ndjson" }),
          },
          body: JSON.stringify({
            session_id: sid,
            message: text,
            client_message_id: clientId,
          }),
          signal: controller.signal,
        });
        accepted = true;
        lastChunkAt = Date.now();
        if (!res.ok) throw new HttpError(res.status);

        const ctype = res.headers.get("content-type") ?? "";
        if (ctype.includes("application/x-ndjson") && res.body) {
          streamed = true;
          let agentRowId: string | null = null;
          let errorCode: string | null = null;
          for await (const ev of readNdjson<ChatStreamEvent>(res.body)) {
            lastChunkAt = Date.now();
            if (ev.type === "ack") {
              // Bookkeeping only: dedupe a later Realtime echo of the user
              // row (multi-tab). The optimistic bubble keeps its local id
              // so React doesn't remount it.
              if (ev.user_message?.id) seenIds.current.add(ev.user_message.id);
              performance.mark?.("chat:ack");
            } else if (ev.type === "delta") {
              if (replyDone) continue;
              if (!streamRef.current || streamRef.current.clientId !== clientId) {
                performance.mark?.("chat:first_delta");
                setPhaseFor(clientId, "streaming");
              }
              appendDelta(clientId, ev.text);
            } else if (ev.type === "reply_done") {
              replyDone = true;
              agentRowId = ev.agent_message.id;
              applyAgentReply({
                row: ev.agent_message,
                clientId,
                profile: ev.profile,
                profileComplete: ev.profile_complete,
              });
              performance.mark?.("chat:reply_done");
              // The reply is on screen: unlock the composer now. Pills
              // trail in a moment later on the same stream.
              inflightClientIdRef.current = null;
              setPhaseFor(clientId, "idle");
            } else if (ev.type === "pills") {
              performance.mark?.("chat:pills");
              const pills = Array.isArray(ev.suggestions) ? ev.suggestions : [];
              if (agentRowId && pills.length > 0) {
                const id = agentRowId;
                setMessages((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, suggestions: pills } : m)),
                );
              }
              adoptLanguage(ev.reply_language);
            } else if (ev.type === "error") {
              errorCode = ev.code || "error";
            } else if (ev.type === "done") {
              break;
            }
          }
          if (!replyDone) throw new StreamTurnError(errorCode ?? "truncated");
          return;
        }

        // Plain JSON: legacy (streaming off), or an outcome decided before
        // the AI ran (duplicate replay, post-handoff note, still pending).
        const data = await res.json();
        if (data.user_message?.id) seenIds.current.add(data.user_message.id);

        // Post-handoff: server short-circuited the AI call. Just leave
        // the optimistic user bubble in place.
        if (data.ai_skipped) return;

        // Duplicate replay whose original turn is still mid-Gemini: the
        // message is saved (won't double-send), the reply just isn't
        // ready yet. Render a retryable error — Retry re-polls with the
        // same client_message_id and picks the reply up once it lands
        // (Realtime may also deliver it first and replace this bubble).
        if (data.ai_pending) {
          appendError(strings.errTimeout, clientId);
          return;
        }

        const agentRow = data.agent_message as ChatMessagesRow | null;
        // A 200 with no agent_message means the turn produced no reply
        // (the server already marked it retryable). Surface it loudly so
        // we never repeat the silent-typing-dots failure.
        if (!agentRow?.id || !agentRow.content) {
          console.error("chat returned 200 but agent_message is missing", data);
          appendError(strings.errNoReply, clientId);
          return;
        }
        applyAgentReply({
          row: agentRow,
          clientId,
          profile: (data.profile as BuyerProfile | undefined) ?? null,
          profileComplete: Boolean(data.profile_complete),
          suggestions: Array.isArray(data.suggestions)
            ? (data.suggestions as string[])
            : undefined,
        });
        adoptLanguage(
          typeof data.reply_language === "string" ? data.reply_language : null,
        );
      } catch (e) {
        // The reply already landed (only the pills tail failed): nothing
        // to show the buyer.
        if (replyDone) return;
        dropStreamBubble(clientId);
        // Realtime delivered the saved AI row while the stream owned it:
        // use it instead of an error.
        const stashed = stashedAiRowRef.current;
        if (stashed && clientIdFromMetadata(stashed.metadata) === clientId) {
          applyAgentReply({ row: stashed, clientId });
          return;
        }
        const aborted =
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        console.error(aborted ? "chat send timed out" : "chat send failed:", e);
        const noReply = e instanceof StreamTurnError && e.code === "no_reply";
        appendError(
          aborted
            ? strings.errTimeout
            : noReply
              ? strings.errNoReply
              : strings.errConnection,
          expectAi ? clientId : undefined,
        );
      } finally {
        clearInterval(watchdog);
        if (inflightClientIdRef.current === clientId) {
          inflightClientIdRef.current = null;
        }
        if (expectAi) setPhaseFor(clientId, "idle");
      }
    },
  );

  // Returns true when the message was accepted (sent, or queued until the
  // session finishes loading); false when it was refused and the composer
  // should keep the text.
  const sendMessage = useStableCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle") return false;
    // Guest hit the free-message limit — surface the signup gate instead of
    // sending. The composer is already locked in the UI, but a suggestion
    // pill or a stray Enter could still reach here.
    if (signupRequired) {
      setSignupGateOpen(true);
      return false;
    }
    const clientId = newClientMessageId();

    if (!sessionId) {
      // Still bootstrapping: queue ONE send (previously it was silently
      // dropped after the input had already been cleared) and flush it as
      // soon as the session exists.
      if (bootstrapError || pendingSendRef.current) return false;
      pendingSendRef.current = { text: trimmed, clientId };
      activeTurnRef.current = clientId;
      setPhase("waiting");
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "user", content: trimmed, clientId },
      ]);
      return true;
    }

    setLastUserMessage({ text: trimmed, clientId });
    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), role: "user", content: trimmed, clientId },
    ]);
    // Stop the outgoing "buyer is typing" broadcast — we just sent.
    notifyStoppedTyping();
    // Post-handoff the message is just a note for the AM: no AI reply, no
    // typing indicator, composer stays free.
    void runTurn(trimmed, clientId, sessionId, !reviewRequested);
    return true;
  });

  // Flush a send queued during bootstrap.
  useEffect(() => {
    if (!sessionId || bootstrapping) return;
    const pending = pendingSendRef.current;
    if (!pending) return;
    pendingSendRef.current = null;
    // The loaded session may already be past the free preview: drop the
    // queued bubble and show the gate instead of sending.
    const priorUserTurns = messages.filter(
      (m) => m.role === "user" && m.clientId !== pending.clientId,
    ).length;
    if (isAnonymous && !reviewRequested && priorUserTurns >= FREE_MESSAGE_LIMIT) {
      activeTurnRef.current = null;
      setPhase("idle");
      setMessages((prev) =>
        prev.filter((m) => !(m.role === "user" && m.clientId === pending.clientId)),
      );
      setSignupGateOpen(true);
      return;
    }
    setLastUserMessage(pending);
    if (reviewRequested) {
      activeTurnRef.current = null;
      setPhase("idle");
    }
    void runTurn(pending.text, pending.clientId, sessionId, !reviewRequested);
  }, [sessionId, bootstrapping, messages, isAnonymous, reviewRequested, runTurn]);

  const retry = useStableCallback(async (): Promise<void> => {
    if (!lastUserMessage || phase !== "idle" || !sessionId) return;
    const { text, clientId } = lastUserMessage;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "agent" && last.error) return prev.slice(0, -1);
      return prev;
    });
    // Same idempotency key as the failed send — if the original POST
    // actually landed server-side, this resolves to its result (or re-runs
    // the turn if it failed) instead of double-inserting the message.
    await runTurn(text, clientId, sessionId, true);
  });

  const requestReview = useStableCallback(async (): Promise<void> => {
    if (reviewSubmitting || reviewRequested || !sessionId || !bootstrap) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/request-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      // Auth gate: backend returns 401 + auth_required when the user is
      // still anonymous. Pop the modal so they can link Google / email.
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data?.auth_required) {
          setAuthPromptOpen(true);
          return;
        }
      }

      // Profile field rejected by CRM validation (typo'd email, etc.).
      // Surface the message inline so the buyer can fix it in chat and
      // retry handoff. Don't flip reviewRequested — they're not handed
      // off yet.
      if (res.status === 422) {
        const data = await res.json().catch(() => ({}));
        appendError(
          data?.message ?? chatStrings(bootstrap?.language).errInvalidField,
        );
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const inserted = (data.inserted_messages ?? []) as ChatMessagesRow[];
      inserted.forEach((m) => seenIds.current.add(m.id));
      // Race-safe append. Supabase Realtime can beat this POST response
      // for these inserts (AI close, divider, AM welcome): handleInsert
      // appends them as soon as they arrive. If that happened, those ids
      // are already in `prev`; we strip them out and re-append all three
      // in DB order so the AI close lands in the right slot.
      const insertedIds = new Set(inserted.map((m) => m.id));
      setMessages((prev) => [
        ...prev.filter((m) => !insertedIds.has(m.id)),
        ...inserted.map(rowToMessage),
      ]);
      // Optimistic: the server just flipped the session to in_handoff and
      // stamped the first sourcing stage — mirror it so the progress rail
      // updates without waiting for a realtime echo.
      setBootstrap((prev) =>
        prev
          ? {
              ...prev,
              reviewRequested: true,
              status: "in_handoff",
              sourcingStage: "brief_submitted",
              handoffRequestedAt:
                prev.handoffRequestedAt ?? new Date().toISOString(),
              sourcingStageHistory: {
                brief_submitted: new Date().toISOString(),
                ...prev.sourcingStageHistory,
              },
            }
          : prev,
      );
    } catch (e) {
      console.error("request review failed:", e);
      appendError(chatStrings(bootstrap?.language).errTransfer);
    } finally {
      setReviewSubmitting(false);
    }
  });

  const dismissAuthPrompt = useCallback(() => setAuthPromptOpen(false), []);
  const openSignupGate = useCallback(() => setSignupGateOpen(true), []);
  const dismissSignupGate = useCallback(() => setSignupGateOpen(false), []);

  // Proactively surface the signup gate the moment an anonymous buyer's free
  // preview runs out — after their FREE_MESSAGE_LIMIT-th reply lands, not
  // mid-turn while the AI is still typing (hence the !loading gate). Ref-guard
  // so dismissing the modal doesn't immediately reopen it on the next render;
  // it resets once the buyer signs in (isAnonymous flips false →
  // signupRequired false) or otherwise leaves the gated state.
  const gateAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!signupRequired) {
      gateAutoOpenedRef.current = false;
      return;
    }
    if (loading || gateAutoOpenedRef.current) return;
    gateAutoOpenedRef.current = true;
    setSignupGateOpen(true);
    // Buyer funnel step: how many guests hit the wall (and, via auth_completed
    // → the same person, how many convert). Browser-side capture, guarded like
    // PostHogIdentify; number-only prop, no PII.
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.capture("signup_gate_shown", { message_count: userMessageCount });
    }
  }, [signupRequired, loading, userMessageCount]);

  // ── Read receipts ───────────────────────────────────────────────────
  // Read receipts only ever render under the ACCOUNT MANAGER's outgoing
  // bubbles (in their dashboard). So only unread AM messages need marking;
  // AI replies don't (this used to fire a mark-read POST after every AI
  // turn). Fires on mount, when an unread AM message arrives, and when the
  // tab becomes visible again.
  const hasUnreadAm = messages.some(
    (m) => m.from === "account_manager" && m.readAt == null,
  );
  const hasUnreadAmRef = useRef(hasUnreadAm);
  useEffect(() => {
    hasUnreadAmRef.current = hasUnreadAm;
  }, [hasUnreadAm]);
  useEffect(() => {
    if (!sessionId || !hasUnreadAm) return;
    if (typeof document !== "undefined" && document.hidden) return;
    void fetch(
      `/api/chat/sessions/${encodeURIComponent(sessionId)}/mark-read`,
      { method: "POST" },
    ).catch((e) => console.error("mark-read failed:", e));
  }, [sessionId, hasUnreadAm, messages.length]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    function onVisibility() {
      if (document.hidden || !sessionId || !hasUnreadAmRef.current) return;
      void fetch(
        `/api/chat/sessions/${encodeURIComponent(sessionId)}/mark-read`,
        { method: "POST" },
      ).catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [sessionId]);

  // Auto-resume handoff after the user returns from OAuth / magic-link
  // verification. The callback route redirects to /chat?resume=handoff;
  // once bootstrap completes with a non-anonymous user, re-fire it so
  // the buyer doesn't have to click Request human review again.
  const resumeAttempted = useRef(false);
  useEffect(() => {
    if (resumeAttempted.current) return;
    if (!bootstrap || typeof window === "undefined") return;
    if (bootstrap.isAnonymous || bootstrap.reviewRequested) return;
    if (!bootstrap.profileComplete) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "handoff") return;
    resumeAttempted.current = true;
    // Strip the query param so a later refresh doesn't double-fire
    window.history.replaceState({}, "", window.location.pathname);
    void requestReview();
  }, [bootstrap, requestReview]);

  return {
    sessionId,
    messages,
    // Any turn in flight (composer locked).
    loading,
    // Request sent, no reply text yet: show the typing indicator. Once
    // text streams, the growing bubble is the indicator.
    awaitingReply: phase === "waiting",
    bootstrapping,
    reviewRequested,
    reviewSubmitting,
    bootstrapError,
    isAnonymous,
    authPromptOpen,
    dismissAuthPrompt,
    signupRequired,
    signupGateOpen,
    openSignupGate,
    dismissSignupGate,
    otherIsTyping,
    notifyTyping,
    sendMessage,
    retry,
    requestReview,
    switchSession,
    // Sidebar list that arrived with the latest bootstrap payload.
    sessionsSeed,
    language: bootstrap?.language ?? "en",
    // Progress-rail data (bootstrap baseline; the page overlays live
    // realtime values for the active session on top of these).
    sessionStatus: bootstrap?.status ?? "ai",
    sessionTitle: bootstrap?.title ?? null,
    handoffRequestedAt: bootstrap?.handoffRequestedAt ?? null,
    sourcingStage: bootstrap?.sourcingStage ?? null,
    sourcingStageHistory: bootstrap?.sourcingStageHistory ?? {},
  };
}
