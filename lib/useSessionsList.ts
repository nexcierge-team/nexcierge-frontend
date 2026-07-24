"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthUser } from "@/lib/useAuthUser";
import { useRealtimeSessions } from "@/lib/useRealtimeSessions";
import type { ChatSessionsRow } from "@/lib/supabase/types";

// The buyer's session list, lifted out of ChatSidebar so a single
// fetch + realtime subscription (channel `sessions:${userId}`) can feed
// both the sidebar and the sourcing-progress rail — two subscribers on
// the same channel name would clobber each other. app/chat/page.tsx
// calls this once and passes the list down as props.

export interface SidebarSession {
  id: string;
  title: string | null;
  status: ChatSessionsRow["status"];
  updated_at: string;
  sourcing_stage: ChatSessionsRow["sourcing_stage"];
  handoff_requested_at: string | null;
}

// Both the GET /api/chat/sessions response and a Realtime chat_sessions
// row carry these fields — narrow them to the list's shape so the fetch
// path and the live-update path produce identical entries.
type SidebarSessionSource = Pick<
  ChatSessionsRow,
  | "id"
  | "title"
  | "status"
  | "updated_at"
  | "sourcing_stage"
  | "handoff_requested_at"
>;

function toSidebarSession(row: SidebarSessionSource): SidebarSession {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    updated_at: row.updated_at,
    sourcing_stage: row.sourcing_stage ?? null,
    handoff_requested_at: row.handoff_requested_at ?? null,
  };
}

// Most-recent first. Stable sort over a small (≤50) list.
function sortByRecent(sessions: SidebarSession[]): SidebarSession[] {
  return [...sessions].sort((a, b) =>
    a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
  );
}

interface UseSessionsListArgs {
  // The currently-open chat_session id. UPDATE events for this row are
  // forwarded to onActiveSessionUpdate even when the row is untitled
  // (untitled rows are excluded from the LIST, but the active session's
  // rail must still see e.g. a stage change on a brand-new chat).
  activeId: string | null;
  // Called when the active session is deleted (this tab or another).
  onDeleteActive?: () => void;
  // Fires on every realtime UPDATE of the active session's row — the
  // page overlays these fields on the useChat bootstrap baseline so the
  // progress rail updates live (AM claims, stage advances).
  onActiveSessionUpdate?: (row: ChatSessionsRow) => void;
}

export function useSessionsList({
  activeId,
  onDeleteActive,
  onActiveSessionUpdate,
}: UseSessionsListArgs) {
  const [sessions, setSessions] = useState<SidebarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Live auth state — single source of truth across the app.
  const { user, isAnonymous } = useAuthUser();

  // Refs so realtime handlers stay identity-stable across renders (the
  // subscription in useRealtimeSessions survives on its own refs, but
  // these avoid stale closures over activeId / callbacks).
  const activeIdRef = useRef(activeId);
  const onDeleteActiveRef = useRef(onDeleteActive);
  const onActiveSessionUpdateRef = useRef(onActiveSessionUpdate);
  useEffect(() => {
    activeIdRef.current = activeId;
    onDeleteActiveRef.current = onDeleteActive;
    onActiveSessionUpdateRef.current = onActiveSessionUpdate;
  }, [activeId, onDeleteActive, onActiveSessionUpdate]);

  // Re-fetch whenever the auth identity changes (anonymous → signed in,
  // or vice versa). Realtime takes over for incremental updates after
  // this cold fetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/sessions", { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const rows: SidebarSessionSource[] = data.sessions ?? [];
        setSessions(sortByRecent(rows.map(toSidebarSession)));
      } catch (e) {
        console.error("sessions list fetch failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Live deltas. Never-started sessions (title still null) are kept out
  // of the list, matching the server-side filter in listSessionsForUser —
  // a chat only earns a row once the buyer sends something. That first
  // message fires a chat_sessions UPDATE (the DB trigger sets the
  // title), so the UPDATE handler upserts rather than only patching
  // rows it already has.
  const handleRealtimeInsert = useCallback((row: ChatSessionsRow) => {
    if (!row.title) return;
    const next = toSidebarSession(row);
    setSessions((prev) => {
      if (prev.some((s) => s.id === next.id)) return prev;
      return sortByRecent([next, ...prev]);
    });
  }, []);

  const handleRealtimeUpdate = useCallback((row: ChatSessionsRow) => {
    // Active-session side channel BEFORE the title filter — the rail
    // must see updates even on an untitled (never-started) session.
    if (row.id === activeIdRef.current) {
      onActiveSessionUpdateRef.current?.(row);
    }
    if (!row.title) return;
    const next = toSidebarSession(row);
    setSessions((prev) =>
      sortByRecent(
        prev.some((s) => s.id === next.id)
          ? prev.map((s) => (s.id === next.id ? next : s))
          : [next, ...prev],
      ),
    );
  }, []);

  const handleRealtimeDelete = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === activeIdRef.current) onDeleteActiveRef.current?.();
  }, []);

  useRealtimeSessions({
    userId: user?.id ?? null,
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
  });

  // POST a new session and return its id (null on failure). No
  // optimistic list insert — the session has no title yet, so it stays
  // out of the sidebar until the first message names it (the Realtime
  // UPDATE handler upserts it then).
  const createSession = useCallback(async (): Promise<string | null> => {
    if (creating) return null;
    setCreating(true);
    try {
      const res = await fetch("/api/chat/sessions", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const id = data?.session?.id as string | undefined;
      return id ?? null;
    } catch (e) {
      console.error("create session failed:", e);
      return null;
    } finally {
      setCreating(false);
    }
  }, [creating]);

  // DELETE a session with optimistic same-tab removal. Returns false on
  // failure so the caller can surface an error. Confirmation UI stays
  // with the caller — this is transport + state only.
  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (deletingId) return false;
      setDeletingId(sessionId);
      try {
        const res = await fetch(
          `/api/chat/sessions/${encodeURIComponent(sessionId)}`,
          { method: "DELETE" },
        );
        if (!res.ok && res.status !== 204) {
          throw new Error(`HTTP ${res.status}`);
        }
        // The Realtime DELETE handler dedups against missing ids, so the
        // eventual cross-tab broadcast is a no-op locally.
        handleRealtimeDelete(sessionId);
        return true;
      } catch (e) {
        console.error("delete session failed:", e);
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, handleRealtimeDelete],
  );

  return {
    sessions,
    loading,
    creating,
    deletingId,
    createSession,
    deleteSession,
    isAnonymous,
  };
}
