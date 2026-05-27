"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { ChatSessionsRow } from "@/lib/supabase/types";

// Live-syncs the sidebar conversation list. Mirrors the pattern in
// useRealtimeChat but stripped of typing/broadcast logic — sidebar only
// needs the three postgres_changes events on chat_sessions, filtered to
// the current buyer. RLS (chat_sessions_select_own_or_am) is enforced
// by Realtime, so the filter is defence-in-depth rather than auth.
//
// The channel is keyed on user_id (not session_id) because the sidebar
// is per-user, not per-session — the user may have many sessions and
// wants every one of them to update live.

interface UseRealtimeSessionsArgs {
  userId: string | null;
  onInsert: (row: ChatSessionsRow) => void;
  onUpdate: (row: ChatSessionsRow) => void;
  onDelete: (id: string) => void;
}

export function useRealtimeSessions({
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSessionsArgs): void {
  // Stable callback refs so a parent re-render (which produces new
  // closure identities for the on* handlers) doesn't tear down the
  // channel and resubscribe.
  const insertRef = useRef(onInsert);
  const updateRef = useRef(onUpdate);
  const deleteRef = useRef(onDelete);
  useEffect(() => {
    insertRef.current = onInsert;
    updateRef.current = onUpdate;
    deleteRef.current = onDelete;
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`sessions:${userId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: ChatSessionsRow }) => {
          insertRef.current(payload.new);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: ChatSessionsRow }) => {
          updateRef.current(payload.new);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_sessions",
          // DELETE payloads only carry the primary key when replica
          // identity is default — filtering by user_id would silently
          // drop every event. We accept all DELETEs on this user-scoped
          // channel (Realtime + RLS already narrow to rows the user can
          // see) and let the handler dedupe by id.
        },
        (payload: { old: { id?: string } }) => {
          const id = payload.old?.id;
          if (id) deleteRef.current(id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
