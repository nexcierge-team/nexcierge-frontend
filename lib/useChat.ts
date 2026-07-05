"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeChat } from "@/lib/useRealtimeChat";
import { chatStrings } from "@/lib/chatStrings";
import type {
  BuyerProfile,
  ChatRole,
  Message,
  MessageFrom,
} from "@/types/chat";
import type {
  ChatMessagesRow,
  ChatSenderType,
} from "@/lib/supabase/types";
import { attachmentsFromMetadata } from "@/lib/attachments";

function newMessageId() {
  return Math.random().toString(36).slice(2);
}

// Idempotency key sent as client_message_id on POST /api/chat. One per
// send; retry() reuses the failed send's key so a timed-out request
// that actually landed server-side isn't inserted (or answered) twice.
function newClientMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Quick-reply pills, written into metadata.suggestions at insert time
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
}

/**
 * Hydrated, DB-backed chat hook.
 *
 * On mount: GET /api/chat/start → bootstraps Supabase session (anon if
 * needed), loads or creates the active chat_session, returns full
 * history + rfq. We render that as the initial message list.
 *
 * Per turn: POST /api/chat → server persists user + ai messages,
 * returns the IDs so we can append locally and dedupe against Realtime
 * echoes (Realtime will arrive once Step 6 wires it up).
 *
 * Per handoff: POST /api/request-review → server flips status to
 * in_handoff, inserts AI close + divider + AM welcome, returns them.
 * (Step 3 will add the AuthModal flow on 401.)
 */
interface UseChatOptions {
  // Pass true to force /api/chat/start to create a brand-new chat_session
  // (skipping the active-session lookup). Used by the marketing homepage
  // chat preview / FAB so every open lands on a blank slate.
  forceNew?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const { forceNew = false } = options;
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  // Drives which session we bootstrap. Initialised from ?session_id=<id>;
  // mutated by switchSession() so the sidebar can swap conversations
  // in-place (no full page reload, no empty-state flash).
  const [targetSessionId, setTargetSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("session_id");
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  // Open AuthModal when /api/request-review returns 401 + auth_required.
  // The chat page renders the modal; we just signal here.
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  // Snapshot of the profile we last rendered as a card. Re-attach the
  // card on any subsequent reply where the profile content changed.
  const [lastAttachedProfile, setLastAttachedProfile] = useState<string | null>(
    null,
  );
  // Text + idempotency key of the last send, kept for retry().
  const [lastUserMessage, setLastUserMessage] = useState<{
    text: string;
    clientId: string;
  } | null>(null);
  // Tracks DB message ids we've already rendered so Realtime echoes
  // (Step 6) don't double-render.
  const seenIds = useRef<Set<string>>(new Set());

  const sessionId = bootstrap?.sessionId ?? null;
  const reviewRequested = bootstrap?.reviewRequested ?? false;

  // ── Bootstrap (initial mount + every in-place session switch) ──
  // Re-fires whenever `targetSessionId` changes. We DON'T clear
  // `messages` here — the previous session's bubbles stay on screen
  // until the new fetch resolves, which avoids the empty-state flash
  // when switching between conversations.
  useEffect(() => {
    let cancelled = false;
    setBootstrapping(true);
    setBootstrapError(null);
    (async () => {
      try {
        const url = targetSessionId
          ? `/api/chat/start?session_id=${encodeURIComponent(targetSessionId)}`
          : forceNew
            ? "/api/chat/start?new=1"
            : "/api/chat/start";
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        // Fresh dedup tracker per session — Realtime ids from the old
        // chat_session_id channel must not bleed into the new one.
        seenIds.current = new Set<string>();
        const initialMessages = (data.messages as ChatMessagesRow[]).map(
          rowToMessage,
        );
        initialMessages.forEach((m) => seenIds.current.add(m.id));
        // Attach the profile card to the last AI message (NOT an
        // account-manager message — those happen post-handoff and the
        // card would visually jump around as the AM types). Pre-handoff
        // this is the most recent AI reply; post-handoff this is the
        // hard-coded HANDOFF_REPLY close. Either way, it's a stable
        // anchor that doesn't move as the conversation continues.
        let attached = false;
        if (data.profile_complete && initialMessages.length > 0) {
          for (let i = initialMessages.length - 1; i >= 0; i--) {
            const m = initialMessages[i];
            if (m.role === "agent" && !m.from) {
              initialMessages[i] = { ...m, profileCard: data.profile };
              attached = true;
              break;
            }
          }
        }
        setLastAttachedProfile(attached ? JSON.stringify(data.profile) : null);
        setLastUserMessage(null);
        setMessages(initialMessages);
        setBootstrap({
          sessionId: data.session.id,
          userId: data.user.id,
          isAnonymous: data.user.is_anonymous,
          profile: data.profile,
          profileComplete: data.profile_complete,
          reviewRequested: data.review_requested,
          language: data.session.language ?? "en",
        });
      } catch (e) {
        if (cancelled) return;
        console.error("chat bootstrap failed:", e);
        setBootstrapError(
          "Couldn't start a chat session. Refresh to try again.",
        );
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetSessionId, forceNew]);

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
  const switchSession = useCallback((id: string | null) => {
    if (typeof window !== "undefined") {
      const url = id ? `/chat?session_id=${encodeURIComponent(id)}` : "/chat";
      if (window.location.pathname + window.location.search !== url) {
        window.history.pushState({}, "", url);
      }
    }
    setTargetSessionId(id);
  }, []);

  const callApi = useCallback(
    async (text: string, clientMessageId: string): Promise<void> => {
      if (!sessionId) return;

      // Hard 30s ceiling on the POST. FastAPI / Gemini typically
      // responds in 2-5s; anything longer is almost certainly a hang
      // (cold start, network glitch, lost server). Without this the
      // typing dots stayed up forever and the user had no feedback.
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), 30_000);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            message: text,
            client_message_id: clientMessageId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutHandle);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Bookkeeping: record user_message.id so a later Realtime echo
        // (e.g. multi-tab) doesn't render it twice. Defense-in-depth on
        // top of the sender_user_id check in useRealtimeChat.
        if (data.user_message?.id) seenIds.current.add(data.user_message.id);
        // agent_message id goes in too, but mostly for symmetry — the
        // Realtime INSERT handler now filters sender_type='ai' so this
        // id will never be checked on the realtime side. Cheap to add.
        if (data.agent_message?.id) seenIds.current.add(data.agent_message.id);

        // Post-handoff: server short-circuited the AI call. Just leave
        // the optimistic user bubble in place.
        if (data.ai_skipped) return;

        // Duplicate replay whose original turn is still mid-Gemini: the
        // message is saved (won't double-send), the reply just isn't
        // ready yet. Render a retryable error — Retry re-polls with the
        // same client_message_id and picks the reply up once it lands.
        if (data.ai_pending) {
          setMessages((prev) => [
            ...prev,
            {
              id: newMessageId(),
              role: "agent",
              content: chatStrings(bootstrap?.language).errTimeout,
              error: true,
            },
          ]);
          return;
        }

        const agentId = data.agent_message?.id as string | undefined;
        const replyText = (data.reply ?? "") as string;

        // Defensive: a 200 OK with no agent_message means the server
        // wrote the user message but never produced an AI reply. Surface
        // it loudly so we never repeat the silent-typing-dots failure.
        if (!agentId || !replyText) {
          console.error(
            "chat returned 200 but agent_message is missing",
            data,
          );
          setMessages((prev) => [
            ...prev,
            {
              id: newMessageId(),
              role: "agent",
              content: chatStrings(bootstrap?.language).errNoReply,
              error: true,
            },
          ]);
          return;
        }

        const profile = data.profile as BuyerProfile | undefined;
        const nowComplete = Boolean(data.profile_complete);
        const profileSnapshot = profile ? JSON.stringify(profile) : null;
        const attachCard =
          Boolean(profile) &&
          nowComplete &&
          profileSnapshot !== lastAttachedProfile;
        if (attachCard) setLastAttachedProfile(profileSnapshot);
        const suggestions = Array.isArray(data.suggestions)
          ? (data.suggestions as string[])
          : undefined;

        // POST is now the sole source of truth for AI message rendering
        // (Realtime filters sender_type='ai'). Append unless this exact
        // row is already on screen (possible when a duplicate replay
        // returns a reply an earlier response delivered).
        // React batches setLoading(false) in sendMessage's `finally` with
        // this setMessages call into one commit, so the user sees the
        // typing dots become the bubble in a single frame.
        setMessages((prev) => prev.some((m) => m.id === agentId) ? prev : [
          ...prev,
          {
            id: agentId,
            role: "agent",
            content: replyText,
            profileCard: attachCard ? profile : undefined,
            suggestions: suggestions && suggestions.length > 0 ? suggestions : undefined,
          },
        ]);

        // Adopt the reply's language (reported by the backend every turn) as
        // the buyer's display language — this drives chat chrome + the
        // summary card from the first turn. Only upgrade to a confident
        // non-'en' code, then stick with it: don't flip back to 'en' on a
        // later short/ambiguous reply. Post-handoff AM replies adopt the
        // language via handleInsert instead.
        const replyLanguage =
          typeof data.reply_language === "string" ? data.reply_language : null;
        if (bootstrap) {
          const nextLanguage =
            replyLanguage &&
            replyLanguage !== "en" &&
            replyLanguage !== bootstrap.language
              ? replyLanguage
              : bootstrap.language;
          if (profile || nextLanguage !== bootstrap.language) {
            setBootstrap({
              ...bootstrap,
              profile: profile ?? bootstrap.profile,
              profileComplete: profile ? nowComplete : bootstrap.profileComplete,
              language: nextLanguage,
            });
          }
        }
      } catch (e) {
        clearTimeout(timeoutHandle);
        const aborted =
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        console.error(
          aborted ? "chat send timed out after 30s" : "chat send failed:",
          e,
        );
        setMessages((prev) => [
          ...prev,
          {
            id: newMessageId(),
            role: "agent",
            content: aborted
              ? chatStrings(bootstrap?.language).errTimeout
              : chatStrings(bootstrap?.language).errConnection,
            error: true,
          },
        ]);
      }
    },
    [sessionId, lastAttachedProfile, bootstrap],
  );

  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || loading || !sessionId) return;
    const clientId = newClientMessageId();
    setLastUserMessage({ text: trimmed, clientId });
    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), role: "user", content: trimmed },
    ]);
    // Stop the outgoing "buyer is typing" broadcast — we just sent.
    notifyStoppedTyping();
    // Only flag `loading=true` (which drives the AI typing dots) when
    // we're actually expecting an AI reply. Post-handoff the message
    // is just a note for the AM; no auto-reply, so no typing indicator
    // on our side.
    const showAiTyping = !reviewRequested;
    if (showAiTyping) setLoading(true);
    try {
      await callApi(trimmed, clientId);
    } finally {
      if (showAiTyping) setLoading(false);
    }
  }

  async function retry(): Promise<void> {
    if (!lastUserMessage || loading) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "agent" && last.error) return prev.slice(0, -1);
      return prev;
    });
    setLoading(true);
    try {
      // Same idempotency key as the failed send — if the original POST
      // actually landed server-side, this resolves to its result instead
      // of double-inserting the message.
      await callApi(lastUserMessage.text, lastUserMessage.clientId);
    } finally {
      setLoading(false);
    }
  }

  async function requestReview(): Promise<void> {
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
        setMessages((prev) => [
          ...prev,
          {
            id: newMessageId(),
            role: "agent",
            content:
              data?.message ?? chatStrings(bootstrap?.language).errInvalidField,
            error: true,
          },
        ]);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const inserted = (data.inserted_messages ?? []) as ChatMessagesRow[];
      inserted.forEach((m) => seenIds.current.add(m.id));
      // Race-safe append. Supabase Realtime can beat this POST response
      // for the non-AI inserts (divider, AM welcome) — useRealtimeChat
      // filters sender_type='ai' but lets system + account_manager rows
      // through, and our handleInsert appends them as soon as they
      // arrive. If that happened, those ids are already in `prev`; we
      // strip them out and re-append all three in DB-order so the AI
      // close lands in the right slot.
      const insertedIds = new Set(inserted.map((m) => m.id));
      setMessages((prev) => [
        ...prev.filter((m) => !insertedIds.has(m.id)),
        ...inserted.map(rowToMessage),
      ]);
      setBootstrap({ ...bootstrap, reviewRequested: true });
    } catch (e) {
      console.error("request review failed:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: "agent",
          content: chatStrings(bootstrap?.language).errTransfer,
          error: true,
        },
      ]);
    } finally {
      setReviewSubmitting(false);
    }
  }

  function dismissAuthPrompt() {
    setAuthPromptOpen(false);
  }

  // Realtime: deduped INSERT + UPDATE handlers + typing presence.
  // Delegated to useRealtimeChat so the same logic powers both buyer
  // and AM views.
  const myUserId = bootstrap?.userId ?? null;
  const handleInsert = useCallback(
    (row: ChatMessagesRow) => {
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
    },
    [],
  );
  const handleUpdate = useCallback((row: ChatMessagesRow) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === row.id ? { ...m, readAt: row.read_at } : m)),
    );
  }, []);
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useRealtimeChat({
    sessionId,
    myUserId,
    myRole: "buyer",
    onMessageInsert: handleInsert,
    onMessageUpdate: handleUpdate,
  });

  // Read receipts (buyer): mark every incoming message as read whenever
  // the tab is focused and there's an unread one. Fires on mount, on
  // visibility change, and whenever the message list grows.
  useEffect(() => {
    if (!sessionId) return;
    if (typeof document !== "undefined" && document.hidden) return;
    const hasUnread = messages.some(
      (m) => m.role !== "user" && m.readAt == null && m.id.length > 8,
    );
    if (!hasUnread) return;
    void fetch(
      `/api/chat/sessions/${encodeURIComponent(sessionId)}/mark-read`,
      { method: "POST" },
    ).catch((e) => console.error("mark-read failed:", e));
  }, [sessionId, messages]);

  // Re-trigger mark-read when the tab becomes visible (user returns from
  // another tab or window). The effect above also runs on focus-induced
  // re-renders, but document.visibilitychange is the canonical signal.
  useEffect(() => {
    if (typeof document === "undefined") return;
    function onVisibility() {
      if (document.hidden || !sessionId) return;
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
    // requestReview is intentionally not in deps — it's a stable closure
    // over bootstrap+sessionId and re-calling on every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap]);

  return {
    sessionId,
    messages,
    loading,
    bootstrapping,
    reviewRequested,
    reviewSubmitting,
    bootstrapError,
    isAnonymous: bootstrap?.isAnonymous ?? true,
    authPromptOpen,
    dismissAuthPrompt,
    otherIsTyping,
    notifyTyping,
    sendMessage,
    retry,
    requestReview,
    switchSession,
    language: bootstrap?.language ?? "en",
  };
}
