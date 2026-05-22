"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { useAuthUser } from "@/lib/useAuthUser";

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
  // Used to refresh the list after navigation / handoff. Defaults to
  // bootstrap-time only; passing a higher value forces a re-fetch.
  refreshKey?: number;
}

interface SidebarSession {
  id: string;
  title: string | null;
  status: "ai" | "in_handoff" | "closed";
  updated_at: string;
}

export function ChatSidebar({
  activeId,
  onNew,
  onSelect,
  onDeleteActive,
  refreshKey,
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
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/sessions", { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setSessions(data.sessions ?? []);
      } catch (e) {
        console.error("sidebar fetch failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, user?.id]);

  async function handleNew() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chat/sessions", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const id = data?.session?.id as string | undefined;
      if (id) onNew(id);
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
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessionId === activeId) onDeleteActive?.();
    } catch (e) {
      console.error("delete session failed:", e);
      window.alert("Couldn't delete that conversation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-gray-200 bg-[#F7F8FA] md:flex">
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
                    onClick={() => onSelect(s.id)}
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
  );
}
