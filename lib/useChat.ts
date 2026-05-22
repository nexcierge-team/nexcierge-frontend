"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
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
  };
}

interface BootstrapState {
  sessionId: string;
  userId: string;
  isAnonymous: boolean;
  profile: BuyerProfile;
  profileComplete: boolean;
  reviewRequested: boolean;
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
        // Attach the profile card to the last agent message if the
        // profile is complete (so refreshing mid-handoff still shows it).
        let attached = false;
        if (data.profile_complete && initialMessages.length > 0) {
          for (let i = initialMessages.length - 1; i >= 0; i--) {
            if (initialMessages[i].role === "agent") {
              initialMessages[i] = {
                ...initialMessages[i],
                profileCard: data.profile,
              };
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
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, message: text }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Record IDs so we don't double-render the Realtime echo.
        if (data.user_message?.id) seenIds.current.add(data.user_message.id);
        if (data.agent_message?.id) seenIds.current.add(data.agent_message.id);

        // Post-handoff: just the user message echo, no agent reply.
        if (data.ai_skipped) {
          // The user message was already appended optimistically in
          // sendMessage. Nothing to add here.
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

        setMessages((prev) => [
          ...prev,
          {
            id: data.agent_message?.id ?? newMessageId(),
            role: "agent",
            content: data.reply ?? "",
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
        console.error("chat send failed:", e);
        setMessages((prev) => [
          ...prev,
          {
            id: newMessageId(),
            role: "agent",
            content:
              "Connection error. Please try again, or check that the backend is running.",
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
    setLoading(true);
    try {
      await callApi(trimmed);
    } finally {
      setLoading(false);
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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const inserted = (data.inserted_messages ?? []) as ChatMessagesRow[];
      inserted.forEach((m) => seenIds.current.add(m.id));
      setMessages((prev) => [...prev, ...inserted.map(rowToMessage)]);
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

  // Realtime subscription. As soon as we know our chat_session_id, open
  // a Postgres-changes channel filtered to messages on that session.
  // Account-manager replies (and any out-of-band server writes) land
  // here without a poll. seenIds dedupes against POST-response echoes
  // and against this subscription's own re-deliveries on reconnect.
  //
  // Important: we skip rows where sender_user_id matches the current
  // user. Those were already rendered optimistically in sendMessage —
  // the realtime arrival would be a duplicate with a different local id
  // (random) vs DB id (UUID), so React can't dedupe via key collision.
  const myUserId = bootstrap?.userId;
  useEffect(() => {
    if (!sessionId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_session_id=eq.${sessionId}`,
        },
        (payload: { new: ChatMessagesRow }) => {
          const row = payload.new;
          if (myUserId && row.sender_user_id === myUserId) {
            // Our own message — already rendered optimistically. Just
            // record the real id so any later operation that looks at
            // seenIds (e.g. another realtime re-delivery) treats it as
            // seen.
            seenIds.current.add(row.id);
            return;
          }
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          setMessages((prev) => [...prev, rowToMessage(row)]);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, myUserId]);

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
    sendMessage,
    retry,
    requestReview,
  };
}
