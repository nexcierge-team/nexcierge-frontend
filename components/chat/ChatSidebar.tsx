"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { useAuthUser } from "@/lib/useAuthUser";
import { prefetchSessionBootstrap } from "@/lib/chatBootstrap";
import { PROGRESS_EN, relativeTime } from "@/lib/progressStrings";
import type { SidebarSession } from "@/lib/useSessionsList";
import type { SourcingStage } from "@/lib/sourcingStages";

// Presentational sidebar: the session list + realtime live in
// lib/useSessionsList.ts (called once by app/chat/page.tsx) so the
// sourcing-progress rail can share the same subscription. This
// component renders what it's given and calls back for actions.

interface ChatSidebarProps {
  sessions: SidebarSession[];
  loading: boolean;
  creating: boolean;
  deletingId: string | null;
  // The currently-loaded chat_session id (drives the active-row highlight).
  activeId?: string;
  // "New sourcing request" clicked. Parent creates + navigates.
  onNew: () => void;
  // A past request clicked. Parent navigates to load it.
  onSelect: (sessionId: string) => void;
  // Delete a session. Resolves false on failure (an alert is shown here).
  onDelete: (sessionId: string) => Promise<boolean>;
  // Mobile drawer control. On desktop (md+) the sidebar is always
  // visible and these props are ignored. On mobile the sidebar is
  // off-canvas by default and slides in when `open` is true; selecting
  // a chat, creating a new one, tapping the backdrop, or pressing
  // Escape all call onClose.
  open?: boolean;
  onClose?: () => void;
}

// Status dot color for a request row, derived from session status +
// sourcing stage. Muted for drafts/closed, amber while waiting on the
// AM, blue while sourcing is actively moving, emerald once delivered.
function statusDotClass(
  status: SidebarSession["status"],
  stage: SourcingStage | null,
): string {
  if (status === "closed") return "bg-gray-300";
  if (status === "ai") return "bg-gray-300";
  if (stage === "delivered") return "bg-emerald-500";
  if (stage === "brief_submitted" || stage === "in_review" || !stage)
    return "bg-amber-400";
  return "bg-blue-500";
}

export function ChatSidebar({
  sessions,
  loading,
  creating,
  deletingId,
  activeId,
  onNew,
  onSelect,
  onDelete,
  open = false,
  onClose,
}: ChatSidebarProps) {
  // Workspace chrome is English-pinned — only the chat itself and the
  // RFQ card localize (see lib/progressStrings.ts).
  const ps = PROGRESS_EN;
  // Live auth state — single source of truth across the app.
  const { isAnonymous } = useAuthUser();

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

  function handleNew() {
    if (creating) return;
    onNew();
    onClose?.();
  }

  async function handleDelete(sessionId: string, title: string | null) {
    if (deletingId) return;
    const label = title?.trim() || "this conversation";
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    const ok = await onDelete(sessionId);
    if (!ok)
      window.alert("Couldn't delete that conversation. Please try again.");
  }

  function statusLabel(s: SidebarSession): string {
    if (s.status === "closed") return ps.statusClosed;
    if (s.status === "ai") return ps.statusDraft;
    return ps.stageShort[s.sourcing_stage ?? "brief_submitted"];
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
        <div className="border-b border-gray-200 px-5 py-4">
          <Link
            href="/"
            className="font-semibold tracking-[0.16em] text-[14px] text-gray-900"
          >
            NEXCIERGE
          </Link>
        </div>

        <div className="px-4 pt-4">
          <button
            onClick={handleNew}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            )}
            {ps.newRequest}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
              {ps.recentRequests}
            </span>
            {sessions.length > 0 && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                {sessions.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="px-3 py-6 text-xs text-gray-400">{ps.loading}</div>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-6 text-xs text-gray-400">
              {ps.noRequests}
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
                      // Warm the conversation's bootstrap payload on hover /
                      // touch so the click renders instantly (lib/chatBootstrap).
                      onPointerEnter={
                        active ? undefined : () => prefetchSessionBootstrap(s.id)
                      }
                      onFocus={
                        active ? undefined : () => prefetchSessionBootstrap(s.id)
                      }
                      disabled={isDeleting}
                      className="flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 pr-9 text-left disabled:cursor-not-allowed"
                    >
                      {/* ph-no-capture: titles derive from the buyer's
                          first message — keep them out of autocapture. */}
                      <span
                        className={cn(
                          "ph-no-capture truncate text-sm",
                          active
                            ? "font-medium text-gray-900"
                            : "text-gray-700",
                        )}
                      >
                        {s.title || ps.untitledRequest}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            statusDotClass(s.status, s.sourcing_stage),
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {statusLabel(s)}
                        </span>
                        <span className="shrink-0">
                          {relativeTime(s.updated_at)}
                        </span>
                      </span>
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
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          strokeWidth={1.75}
                        />
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
              ? "Guest · sign in on handoff to save history"
              : "Your account"}
          </div>
          <AccountMenu variant="compact" redirectTo="/chat" />
        </div>
      </aside>
    </>
  );
}
