"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type {
  ChatMessagesRow,
  ChatSenderType,
} from "@/lib/supabase/types";

// Both buyer and AM subscribe to the SAME channel name per session
// so broadcasts (typing) reach each other. Postgres-changes (message
// INSERTs + UPDATEs) come from the same channel.
function channelName(sessionId: string): string {
  return `session:${sessionId}`;
}

// How long after the last keypress before we emit "stopped typing".
const TYPING_STOP_DEBOUNCE_MS = 2500;
// Safety net: even if we missed a stop event, decay the indicator
// after this long with no fresh "typing" events from the other side.
const TYPING_FALLBACK_TIMEOUT_MS = 4000;
// Minimum gap between outgoing "typing" broadcasts. Composer onChange
// fires per keystroke; we don't want to broadcast 60×/sec.
const TYPING_THROTTLE_MS = 1500;

type Role = "buyer" | "account_manager";

interface UseRealtimeChatArgs {
  sessionId: string | null;
  myUserId: string | null;
  myRole: Role;
  // Called for every chat_messages INSERT on this session, EXCEPT the
  // caller's own messages (those were rendered optimistically by the
  // sender). Caller dedupes against seen-ids if it has its own.
  onMessageInsert: (row: ChatMessagesRow) => void;
  // Called for every UPDATE. Currently only read_at flips fire this,
  // but the hook is shape-agnostic — caller decides what to do.
  onMessageUpdate: (row: ChatMessagesRow) => void;
}

interface UseRealtimeChatResult {
  // True while the OTHER role has typed within the last few seconds.
  otherIsTyping: boolean;
  // Call from the composer's onChange. Throttled broadcast, safe to
  // invoke per keystroke.
  notifyTyping: () => void;
  // Manually emit a "stopped typing" event (e.g. on send / blur).
  notifyStoppedTyping: () => void;
}

export function useRealtimeChat({
  sessionId,
  myUserId,
  myRole,
  onMessageInsert,
  onMessageUpdate,
}: UseRealtimeChatArgs): UseRealtimeChatResult {
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  // Stable refs to callbacks so the subscription doesn't tear down on
  // every render of the parent component.
  const insertRef = useRef(onMessageInsert);
  const updateRef = useRef(onMessageUpdate);
  useEffect(() => {
    insertRef.current = onMessageInsert;
    updateRef.current = onMessageUpdate;
  }, [onMessageInsert, onMessageUpdate]);

  // Channel handle (so notifyTyping can broadcast on the same one we
  // subscribed to).
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseBrowser>["channel"]
  > | null>(null);

  // Auto-clear timer for the typing indicator.
  const stopIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Throttle + idle timers for outgoing typing broadcasts.
  const lastTypingSentAt = useRef(0);
  const stopBroadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(channelName(sessionId), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
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
          // Skip our own messages — caller rendered them optimistically.
          if (myUserId && row.sender_user_id === myUserId) return;
          // Skip AI messages — POST /api/chat returns them in its
          // response, and the POST path is the single source of truth.
          // Without this skip we'd race the POST and either duplicate
          // the bubble or silently swallow it (the failure mode that
          // motivated this whole rewrite).
          if (row.sender_type === "ai") return;
          insertRef.current(row);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `chat_session_id=eq.${sessionId}`,
        },
        (payload: { new: ChatMessagesRow }) => {
          updateRef.current(payload.new);
        },
      )
      .on(
        "broadcast",
        { event: "typing" },
        (payload: { payload?: { role: Role; typing: boolean } }) => {
          const data = payload.payload;
          if (!data || data.role === myRole) return;
        if (data.typing) {
          setOtherIsTyping(true);
          if (stopIndicatorTimer.current) clearTimeout(stopIndicatorTimer.current);
          stopIndicatorTimer.current = setTimeout(() => {
            setOtherIsTyping(false);
          }, TYPING_FALLBACK_TIMEOUT_MS);
        } else {
          if (stopIndicatorTimer.current) clearTimeout(stopIndicatorTimer.current);
          setOtherIsTyping(false);
        }
      })
      .subscribe();

    return () => {
      if (stopIndicatorTimer.current) clearTimeout(stopIndicatorTimer.current);
      if (stopBroadcastTimer.current) clearTimeout(stopBroadcastTimer.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, myUserId, myRole]);

  const sendTyping = useCallback(
    (typing: boolean) => {
      const channel = channelRef.current;
      if (!channel) return;
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { role: myRole, typing },
      });
    },
    [myRole],
  );

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    // Throttle outgoing "typing" so we send at most once per
    // TYPING_THROTTLE_MS while the user is actively typing.
    if (now - lastTypingSentAt.current > TYPING_THROTTLE_MS) {
      sendTyping(true);
      lastTypingSentAt.current = now;
    }
    // Schedule a "stopped typing" broadcast after TYPING_STOP_DEBOUNCE_MS
    // of no further keystrokes. Each new keystroke pushes this out.
    if (stopBroadcastTimer.current) clearTimeout(stopBroadcastTimer.current);
    stopBroadcastTimer.current = setTimeout(() => {
      sendTyping(false);
      lastTypingSentAt.current = 0;
    }, TYPING_STOP_DEBOUNCE_MS);
  }, [sendTyping]);

  const notifyStoppedTyping = useCallback(() => {
    if (stopBroadcastTimer.current) clearTimeout(stopBroadcastTimer.current);
    if (lastTypingSentAt.current === 0) return;
    sendTyping(false);
    lastTypingSentAt.current = 0;
  }, [sendTyping]);

  return { otherIsTyping, notifyTyping, notifyStoppedTyping };
}

// Re-export so call sites can type the row argument cleanly.
export type { ChatMessagesRow, ChatSenderType };
