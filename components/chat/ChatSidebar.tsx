"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CircleCheck,
  Inbox,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { Wordmark } from "@/components/layout/Wordmark";
import { useAuthUser } from "@/lib/useAuthUser";
import { prefetchSessionBootstrap } from "@/lib/chatBootstrap";
import { PROGRESS_EN, relativeTime } from "@/lib/progressStrings";
import {
  REQUEST_FILTERS,
  filterCounts,
  groupByDate,
  matchesFilter,
  type RequestFilter,
} from "@/lib/requestFilters";
import type { SidebarSession } from "@/lib/useSessionsList";
import type { SourcingStage } from "@/lib/sourcingStages";

// Buyer app sidebar. Presentational: the session list + realtime live in
// lib/useSessionsList.ts (called once by app/chat/page.tsx) so the
// sourcing-progress rail can share the same subscription. Owns only view
// state: the status filter (persisted per browser), the search box, and
// the collapsed rail at md+.
//
// Layout: wordmark + collapse toggle, New sourcing request, status nav
// (All / Drafts / In progress / Completed, with counts), search, then the
// filtered list grouped by recency (Today, Previous 7 days, ...).
// Collapsed (md+ only): a 56px icon rail with expand, new request and the
// four status filters. Below md it's an off-canvas drawer, never collapsed.

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
  // Mobile drawer control (below md). Selecting a chat, creating one,
  // tapping the backdrop, or pressing Escape all call onClose.
  open?: boolean;
  onClose?: () => void;
  // Desktop (md+) collapsed icon rail.
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const FILTER_KEY = "nx_request_filter";

const FILTER_ICON: Record<RequestFilter, LucideIcon> = {
  all: Inbox,
  draft: PencilLine,
  active: Truck,
  done: CircleCheck,
};

function readStoredFilter(): RequestFilter {
  try {
    const v = window.localStorage.getItem(FILTER_KEY);
    return (REQUEST_FILTERS as string[]).includes(v ?? "")
      ? (v as RequestFilter)
      : "all";
  } catch {
    return "all";
  }
}

// Status dot color for a request row, derived from session status +
// sourcing stage. Muted for drafts/closed, amber while waiting on the
// AM, blue while sourcing is actively moving, emerald once delivered.
function statusDotClass(
  status: SidebarSession["status"],
  stage: SourcingStage | null,
): string {
  if (status === "closed") return "bg-gray-400";
  if (status === "ai") return "bg-gray-400";
  if (stage === "delivered") return "bg-emerald-600";
  if (stage === "brief_submitted" || stage === "in_review" || !stage)
    return "bg-amber-600";
  return "bg-blueprint";
}

const ICON_BTN =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint";

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
  collapsed = false,
  onToggleCollapsed,
}: ChatSidebarProps) {
  // Workspace chrome is English-pinned: only the chat itself and the
  // RFQ card localize (see lib/progressStrings.ts).
  const ps = PROGRESS_EN;
  const { isAnonymous } = useAuthUser();
  // /chat is client-rendered (useSearchParams bailout), so reading
  // storage in the initializer can't cause a hydration mismatch.
  const [filter, setFilterState] = useState<RequestFilter>(() =>
    typeof window === "undefined" ? "all" : readStoredFilter(),
  );
  const [query, setQuery] = useState("");

  function setFilter(next: RequestFilter) {
    setFilterState(next);
    try {
      window.localStorage.setItem(FILTER_KEY, next);
    } catch {
      // Storage blocked: the filter still works for this page view.
    }
  }

  // Mobile drawer: Escape closes.
  useEffect(() => {
    if (!open || !onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const counts = useMemo(() => filterCounts(sessions), [sessions]);
  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      groupByDate(
        sessions.filter(
          (s) =>
            matchesFilter(s, filter) &&
            (!q || (s.title ?? "").toLowerCase().includes(q)),
        ),
      ),
    [sessions, filter, q],
  );

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
      {/* Mobile-only backdrop. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Collapsed icon rail (md+ only). */}
      {collapsed && (
        <nav
          aria-label="Requests"
          className="hidden h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-rule-strong bg-paper py-3 md:flex"
        >
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={ps.expandSidebar}
            title={ps.expandSidebar}
            className={ICON_BTN}
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleNew}
            disabled={creating}
            aria-label={ps.newRequest}
            title={ps.newRequest}
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-sm border-2 border-ink bg-paint text-ink btn-wipe hover:text-paint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
          <div className="my-2 h-px w-8 bg-rule-strong" aria-hidden />
          {REQUEST_FILTERS.map((f) => {
            const Icon = FILTER_ICON[f];
            const label = `${ps.filterLabel[f]} (${counts[f]})`;
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFilter(f);
                  onToggleCollapsed?.();
                }}
                aria-label={label}
                title={label}
                className={cn(
                  ICON_BTN,
                  "relative",
                  filter === f && "bg-ink text-paint hover:bg-ink hover:text-paint",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            );
          })}
        </nav>
      )}

      <aside
        className={cn(
          // Mobile: off-canvas fixed drawer that slides in from the left.
          "fixed inset-y-0 left-0 z-40 flex h-full w-[85%] max-w-[18rem] shrink-0 flex-col border-r border-rule-strong bg-paper pt-safe pb-safe transition-transform duration-200 ease-out",
          // Desktop: inline flex child, no transform (hidden when collapsed).
          "md:static md:w-72 md:max-w-none md:translate-x-0 md:pt-0 md:pb-0",
          collapsed ? "md:hidden" : "md:flex",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
          <Link href="/" className="inline-block px-1 leading-none">
            <Wordmark className="text-[17px]" />
          </Link>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={ps.collapseSidebar}
              title={ps.collapseSidebar}
              className={cn(ICON_BTN, "hidden md:flex")}
            >
              <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={ps.closeAria}
              className={cn(ICON_BTN, "md:hidden")}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="px-3 pt-2">
          <button
            onClick={handleNew}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-ink bg-paint px-4 py-2.5 text-sm font-bold leading-none text-ink type-title btn-wipe hover:text-paint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            )}
            {ps.newRequest}
          </button>
        </div>

        {/* Status nav: folder-style filters with live counts. */}
        <nav aria-label={ps.filterAria} className="px-3 pt-4">
          <ul className="space-y-0.5">
            {REQUEST_FILTERS.map((f) => {
              const Icon = FILTER_ICON[f];
              const selected = filter === f;
              return (
                <li key={f}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint",
                      selected
                        ? "bg-ink font-semibold text-sheet"
                        : "text-gray-700 hover:bg-ink/10 hover:text-ink",
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4 shrink-0", selected && "text-paint")}
                      strokeWidth={1.5}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {ps.filterLabel[f]}
                    </span>
                    <span
                      className={cn(
                        "type-data min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold",
                        selected ? "bg-paint text-ink" : "bg-ink/10 text-ink",
                      )}
                    >
                      {counts[f]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 pb-1 pt-4">
          <label className="relative block">
            <span className="sr-only">{ps.searchAria}</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ps.searchPlaceholder}
              className="ph-no-capture w-full rounded-sm border border-rule-strong bg-white py-1.5 pl-8 pr-2.5 text-sm text-ink placeholder:text-gray-500 focus:border-ink focus:outline-none"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
          {loading ? (
            <div className="px-2.5 py-6 text-xs text-gray-500">{ps.loading}</div>
          ) : groups.length === 0 ? (
            <div className="px-2.5 py-6 text-xs leading-relaxed text-gray-500">
              {q ? ps.noMatches : ps.filterEmpty[filter]}
            </div>
          ) : (
            groups.map(({ group, items }) => (
              <section key={group} className="pt-2">
                <h3 className="type-data px-2.5 pb-1 pt-1 text-[11px] font-semibold text-ink-soft">
                  {ps.dateGroup[group]}
                </h3>
                <ul className="space-y-0.5">
                  {items.map((s) => {
                    const active = s.id === activeId;
                    const isDeleting = deletingId === s.id;
                    return (
                      <li
                        key={s.id}
                        className={cn(
                          "group relative rounded-sm border-l-[3px] transition-colors",
                          active
                            ? "border-paint bg-sheet ring-1 ring-rule-strong"
                            : "border-transparent hover:bg-sheet/70",
                          isDeleting && "opacity-50",
                        )}
                      >
                        <button
                          onClick={() => handleSelectAndClose(s.id)}
                          // Warm the conversation's bootstrap payload on hover /
                          // focus so the click renders instantly (lib/chatBootstrap).
                          onPointerEnter={
                            active ? undefined : () => prefetchSessionBootstrap(s.id)
                          }
                          onFocus={
                            active ? undefined : () => prefetchSessionBootstrap(s.id)
                          }
                          disabled={isDeleting}
                          aria-current={active ? "page" : undefined}
                          className="flex w-full flex-col gap-0.5 rounded-sm px-2.5 py-2 pr-9 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-inset disabled:cursor-not-allowed"
                        >
                          {/* ph-no-capture: titles derive from the buyer's
                              first message. */}
                          <span
                            className={cn(
                              "ph-no-capture truncate text-sm",
                              active ? "font-semibold text-ink" : "text-gray-700",
                            )}
                          >
                            {s.title || ps.untitledRequest}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
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
                            <span className="type-data shrink-0">
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
                            "absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-gray-500 transition-all",
                            "opacity-0 group-hover:opacity-100 focus:opacity-100",
                            "hover:bg-ink/10 hover:text-red-700",
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
              </section>
            ))
          )}
        </div>

        <div className="border-t border-rule-strong p-4">
          <div className="type-data mb-1 text-[11px] font-semibold text-ink-soft">
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
