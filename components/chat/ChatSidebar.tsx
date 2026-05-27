"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { useAuthUser } from "@/lib/useAuthUser";
import { useRealtimeSessions } from "@/lib/useRealtimeSessions";
import type { ChatSessionsRow } from "@/lib/supabase/types";

interface ChatSidebarProps {
  // The currently-loaded chat_session id (drives the active-row highlight).
  activeId?: string;
  // Called after a new chat_session has been created server-side.
  // Receives the new session id so the parent can navigate to it.
  onNew: (newSessionId: string) => void;
  // Called when a past chat is clicked. Parent navigates to load it.
  onSelect: (sessionId: string) => void;
  // Called when the active conversation is deleted — parent should
  // navigate the user somewhere safe (e.g. /chat with no session_id
  // so a fresh one is created).
  onDeleteActive?: () => void;
  // Mobile drawer control. On desktop (md+) the sidebar is always
  // visible and these props are ignored. On mobile the sidebar is
  // off-canvas by default and slides in when `open` is true; selecting
  // a chat, creating a new one, tapping the backdrop, or pressing
  // Escape all call onClose.
  open?: boolean;
  onClose?: () => void;
}

interface SidebarSession {
  id: string;
  title: string | null;
  status: "ai" | "in_handoff" | "closed";
  updated_at: string;
}

// Both the GET /api/chat/sessions response and a Realtime chat_sessions
// row carry these four fields — narrow them to the sidebar's shape so
// the fetch path and the live-update path produce identical entries.
type SidebarSessionSource = Pick<
  ChatSessionsRow,
  "id" | "title" | "status" | "updated_at"
>;

function toSidebarSession(row: SidebarSessionSource): SidebarSession {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    updated_at: row.updated_at,
  };
}

// Most-recent first. Stable sort over a small (≤50) list.
function sortByRecent(sessions: SidebarSession[]): SidebarSession[] {
  return [...sessions].sort((a, b) =>
    a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
  );
}

export function ChatSidebar({
  activeId,
  onNew,
  onSelect,
  onDeleteActive,
  open = false,
  onClose,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<SidebarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Live auth state — single source of truth across the app. Replaces
  // the stale fetched `is_anonymous` that wouldn't refresh after sign-in.
  const { user, isAnonymous } = useAuthUser();

  // Re-fetch sessions whenever the auth identity changes (anonymous →
  // signed in, or vice versa). user.id flips on linkIdentity / signOut.
  // Realtime takes over for incremental updates after this cold fetch.
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
        console.error("sidebar fetch failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Live deltas: new chat created anywhere (sidebar "+", seed flow,
  // useChat bootstrap, or a second browser tab) → INSERT. Title /
  // status / language change → UPDATE. Row deleted → DELETE.
  const handleRealtimeInsert = useCallback((row: ChatSessionsRow) => {
    const next = toSidebarSession(row);
    setSessions((prev) => {
      if (prev.some((s) => s.id === next.id)) return prev;
      return sortByRecent([next, ...prev]);
    });
  }, []);

  const handleRealtimeUpdate = useCallback((row: ChatSessionsRow) => {
    const next = toSidebarSession(row);
    setSessions((prev) => {
      if (!prev.some((s) => s.id === next.id)) return prev;
      return sortByRecent(prev.map((s) => (s.id === next.id ? next : s)));
    });
  }, []);

  const handleRealtimeDelete = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (id === activeId) onDeleteActive?.();
    },
    [activeId, onDeleteActive],
  );

  useRealtimeSessions({
    userId: user?.id ?? null,
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
  });

  // Mobile drawer: Escape closes. Desktop ignores (onClose is undefined
  // when the parent doesn't wire drawer behavior).
  useEffect(() => {
    if (!open || !onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleSelectAndClose(sessionId: string) {
    onSelect(sessionId);
    onClose?.();
  }

  async function handleNew() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chat/sessions", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const session = data?.session as SidebarSessionSource | undefined;
      if (!session?.id) return;
      // Optimistic same-tab update. The Realtime INSERT for this row
      // dedups against the id check in handleRealtimeInsert, so this is
      // a no-op for other tabs (they get the row via Realtime).
      handleRealtimeInsert(session as ChatSessionsRow);
      onNew(session.id);
      onClose?.();
    } catch (e) {
      console.error("create session failed:", e);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(sessionId: string, title: string | null) {
    if (deletingId) return;
    const label = title?.trim() || "this conversation";
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    setDeletingId(sessionId);
    try {
      const res = await fetch(
        `/api/chat/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      );
      if (!res.ok && res.status !== 204) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Optimistic same-tab removal. The Realtime DELETE filter on
      // handleRealtimeDelete already dedups against missing ids, so the
      // eventual cross-tab broadcast is a no-op locally.
      handleRealtimeDelete(sessionId);
    } catch (e) {
      console.error("delete session failed:", e);
      window.alert("Couldn't delete that conversation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Mobile-only backdrop. Desktop never renders it (md:hidden) and
          the parent leaves `open` falsy when the sidebar is inline. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          // Mobile: off-canvas fixed drawer that slides in from the left.
          "fixed inset-y-0 left-0 z-40 flex h-full w-[85%] max-w-[18rem] shrink-0 flex-col border-r border-gray-200 bg-[#F7F8FA] pt-safe pb-safe transition-transform duration-200 ease-out",
          // Desktop: inline flex child, always visible, no transform.
          "md:static md:w-72 md:max-w-none md:translate-x-0 md:pt-0 md:pb-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <Link
          href="/"
          className="font-semibold tracking-[0.16em] text-[14px] text-gray-900"
        >
          NEXCIERGE
        </Link>
        <button
          onClick={handleNew}
          disabled={creating}
          aria-label="New conversation"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
          Conversations
        </div>
        {loading ? (
          <div className="px-3 py-6 text-xs text-gray-400">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-6 text-xs text-gray-400">
            No conversations yet.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((s) => {
              const active = s.id === activeId;
              const isDeleting = deletingId === s.id;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "group relative rounded-lg transition-colors",
                    active
                      ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "hover:bg-white/60",
                    isDeleting && "opacity-50",
                  )}
                >
                  <button
                    onClick={() => handleSelectAndClose(s.id)}
                    disabled={isDeleting}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 pr-9 text-left disabled:cursor-not-allowed"
                  >
                    <MessageSquare
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        active ? "text-gray-900" : "text-gray-400",
                      )}
                      strokeWidth={1.5}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-sm",
                          active
                            ? "font-medium text-gray-900"
                            : "text-gray-700",
                        )}
                      >
                        {s.title || "New conversation"}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-400">
                        {s.status === "in_handoff"
                          ? "Handed off to account manager"
                          : s.status === "closed"
                            ? "Closed"
                            : "Chatting with AI"}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(s.id, s.title);
                    }}
                    disabled={isDeleting}
                    aria-label={`Delete conversation ${s.title || "untitled"}`}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-all",
                      "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      "hover:bg-gray-100 hover:text-red-600",
                      "disabled:cursor-not-allowed disabled:opacity-30",
                    )}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
          {isAnonymous
            ? "Guest — sign in on handoff to save history"
            : "Your account"}
        </div>
        <AccountMenu variant="compact" redirectTo="/chat" />
      </div>
    </aside>
    </>
  );
}
