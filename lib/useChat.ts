"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeChat } from "@/lib/useRealtimeChat";
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

function newMessageId() {
  return Math.random().toString(36).slice(2);
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
export function useChat() {
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
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
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  // Tracks DB message ids we've already rendered so Realtime echoes
  // (Step 6) don't double-render.
  const seenIds = useRef<Set<string>>(new Set());

  const sessionId = bootstrap?.sessionId ?? null;
  const reviewRequested = bootstrap?.reviewRequested ?? false;

  // ── Bootstrap on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Honor /chat?session_id=<uuid> so the sidebar can switch
        // between past chats. Without it, we load the most-recent
        // active session for this user.
        const sessionIdParam =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("session_id")
            : null;
        const url = sessionIdParam
          ? `/api/chat/start?session_id=${encodeURIComponent(sessionIdParam)}`
          : "/api/chat/start";
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
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
        if (attached) {
          setLastAttachedProfile(JSON.stringify(data.profile));
        }
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
          "Couldn't start a chat session. Refresh to try again, or check the backend is running.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const callApi = useCallback(
    async (text: string): Promise<void> => {
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
          body: JSON.stringify({ session_id: sessionId, message: text }),
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
              content:
                "The AI didn't return a reply. Please try again.",
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

        // POST is now the sole source of truth for AI message rendering
        // (Realtime filters sender_type='ai'). Unconditionally append.
        // React batches setLoading(false) in sendMessage's `finally` with
        // this setMessages call into one commit, so the user sees the
        // typing dots become the bubble in a single frame.
        setMessages((prev) => [
          ...prev,
          {
            id: agentId,
            role: "agent",
            content: replyText,
            profileCard: attachCard ? profile : undefined,
          },
        ]);

        if (bootstrap && profile) {
          setBootstrap({
            ...bootstrap,
            profile,
            profileComplete: nowComplete,
          });
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
              ? "The AI took too long to respond. Please try again."
              : "Connection error. Please try again, or check that the backend is running.",
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
    setLastUserMessage(trimmed);
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
      await callApi(trimmed);
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
      await callApi(lastUserMessage);
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
              data?.message ??
              "One of your details looks invalid. Please correct it in chat and try Request human review again.",
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
          content:
            "Couldn't transfer to our account manager just now — please try again, or check the backend is running.",
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

  // Optimistically flip the local language so the picker chip updates
  // before the PATCH returns; revert on failure. New AI replies pick up
  // the language on the very next /api/chat turn (the route reads
  // session.language fresh from the DB each call).
  async function setLanguage(code: string): Promise<void> {
    if (!sessionId || !bootstrap) return;
    if (bootstrap.language === code) return;
    const prev = bootstrap.language;
    setBootstrap({ ...bootstrap, language: code });
    try {
      const res = await fetch(
        `/api/chat/sessions/${encodeURIComponent(sessionId)}/language`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: code }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("language update failed:", e);
      setBootstrap({ ...bootstrap, language: prev });
    }
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
    language: bootstrap?.language ?? "en",
    setLanguage,
  };
}
