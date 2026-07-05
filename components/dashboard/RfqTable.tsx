"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/timeAgo";
import {
  claimStatus,
  inboxRfq,
  type ClaimStatus,
  type InboxBrief,
} from "./types";

export type BriefTab = "all" | "mine" | "unclaimed";

const PAGE_SIZE = 10;

const TABS: { id: BriefTab; label: string }[] = [
  { id: "all", label: "All briefs" },
  { id: "mine", label: "Mine" },
  { id: "unclaimed", label: "Unclaimed" },
];

const STATUS_PILL: Record<ClaimStatus, { label: string; className: string }> = {
  mine: { label: "Mine", className: "bg-emerald-100 text-emerald-800" },
  unclaimed: {
    label: "Unclaimed",
    className: "bg-amber-100 text-amber-800",
  },
  other: { label: "Other AM", className: "bg-gray-200 text-gray-600" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function matchesQuery(brief: InboxBrief, query: string): boolean {
  const r = inboxRfq(brief);
  const haystack = [
    brief.title,
    r?.machine_type,
    r?.intended_application,
    r?.full_name,
    r?.company_name,
    r?.business_email,
    r?.delivery_country,
    r?.delivery_city_or_port,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

// Incoming-briefs table: the whole handoff inbox with Mine/Unclaimed
// filters and client-side search. Rows open the brief's chat view.
export function RfqTable({
  briefs,
  loading,
  meId,
  tab,
  onTabChange,
  query,
  onSelect,
}: {
  briefs: InboxBrief[];
  loading: boolean;
  meId: string | null;
  tab: BriefTab;
  onTabChange: (tab: BriefTab) => void;
  query: string;
  onSelect: (sessionId: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const searched = q ? briefs.filter((b) => matchesQuery(b, q)) : briefs;
  const visible = searched.filter((b) => {
    if (tab === "all") return true;
    return claimStatus(b, meId) === tab;
  });
  const tabCount = (t: BriefTab) =>
    t === "all"
      ? searched.length
      : searched.filter((b) => claimStatus(b, meId) === t).length;

  // Client-side paging — the inbox payload is already fully loaded, we
  // just cap what's rendered. Reset to the first page whenever the
  // filter context changes (the render-time state adjustment is the
  // React-sanctioned alternative to a setState-in-effect).
  const [page, setPage] = useState(0);
  const [prevFilterKey, setPrevFilterKey] = useState(`${tab}|${q}`);
  const filterKey = `${tab}|${q}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  // Clamp instead of trusting `page` — the list can shrink under us
  // (e.g. a brief gets claimed elsewhere and the inbox refreshes).
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageRows = visible.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Incoming briefs
        </h2>
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-[#0F2747] text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              {t.label} · {tabCount(t.id)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          Loading briefs…
        </div>
      ) : visible.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          {q
            ? "No briefs match your search."
            : tab === "unclaimed"
              ? "No unclaimed briefs — everything has an owner."
              : tab === "mine"
                ? "No briefs assigned to you yet. Claim one from the Unclaimed tab."
                : "No new briefs. Incoming requests will appear here."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3 font-medium">Brief</th>
                <th className="px-5 py-3 font-medium">Buyer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((b) => {
                const r = inboxRfq(b);
                const pill = STATUS_PILL[claimStatus(b, meId)];
                const buyerName =
                  r?.full_name || r?.company_name || r?.business_email || "—";
                const place = [r?.delivery_city_or_port, r?.delivery_country]
                  .filter(Boolean)
                  .join(", ");
                const subtitle = [
                  r?.quantity ? `Qty ${r.quantity}` : null,
                  place || null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelect(b.id)}
                    // ph-no-capture: rows render buyer name, company, and
                    // machine type. Opening a brief isn't a tracked CTA, so
                    // dropping the row's autocapture click costs no analytics.
                    className="ph-no-capture cursor-pointer border-b border-gray-50 transition-colors last:border-b-0 hover:bg-gray-50/70"
                  >
                    <td className="max-w-[280px] px-5 py-3.5">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {r?.machine_type || b.title || "New brief"}
                      </div>
                      {subtitle && (
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          {subtitle}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[240px] px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCE8F8] text-[11px] font-medium text-[#0F2747]">
                          {initials(buyerName)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm text-gray-900">
                            {buyerName}
                          </div>
                          {r?.company_name && r.company_name !== buyerName && (
                            <div className="truncate text-xs text-gray-500">
                              {r.company_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium",
                          pill.className,
                        )}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-500">
                      {timeAgo(b.updated_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center justify-end gap-2 text-gray-400">
                        <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
              <span className="text-xs text-gray-500">
                Showing {pageStart + 1}–
                {Math.min(pageStart + PAGE_SIZE, visible.length)} of{" "}
                {visible.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <span className="text-xs tabular-nums text-gray-500">
                  Page {safePage + 1} of {pageCount}
                </span>
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= pageCount - 1}
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
