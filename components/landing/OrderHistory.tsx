"use client";

import { useState } from "react";
import { ACCOUNT, type HistoryKind } from "@/lib/landingContent";
import { cn } from "@/lib/utils";

// Plain-text kind labels instead of coloured badges; a small dot keeps
// the three kinds distinguishable at a glance.
const KIND: Record<HistoryKind, { label: string; dot: string }> = {
  chat: { label: "Message", dot: "bg-ink" },
  doc: { label: "Document", dot: "border border-ink bg-transparent" },
  pay: { label: "Payment", dot: "bg-paint ring-1 ring-ink" },
};

type Filter = "all" | HistoryKind;

// An illustrative order timeline (clearly labelled as an example),
// filterable by what kind of record each row is. Mirrors what a buyer's
// account holds; it is not live data.
export function OrderHistory() {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = ACCOUNT.history.filter(
    (r) => filter === "all" || r.kind === filter,
  );
  const noun = ACCOUNT.filters.find((f) => f.key === filter)!.noun;

  return (
    <section
      className="min-w-0 border border-rule-strong bg-white"
      aria-labelledby="order-activity-title"
    >
      <header className="grid gap-3 border-b border-rule px-4 py-4 min-[560px]:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id="order-activity-title" className="type-title text-lg font-semibold">
            {ACCOUNT.panelTitle}
          </h3>
          <span className="type-data text-[13px] font-medium text-ink-soft">
            {ACCOUNT.orderLabel}
          </span>
        </div>
        <p className="font-medium leading-snug text-ink">{ACCOUNT.orderName}</p>
        {/* Text tabs rather than a boxed control, so they wrap cleanly on
            phones. */}
        <div className="-mb-4 flex flex-wrap gap-x-5" role="group" aria-label="Show">
          {ACCOUNT.filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className="min-h-11 border-b-2 border-transparent text-[15px] font-medium text-ink-soft transition-colors hover:text-ink aria-pressed:border-paint aria-pressed:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blueprint"
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Keyed on the filter so the rows replay their entrance on change. */}
      <ol key={filter} className="px-4 min-[560px]:px-5">
        {rows.map((row, i) => (
          <li
            key={row.label}
            className="row-in grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-rule py-2.5 last:border-b-0 min-[560px]:grid-cols-[104px_minmax(0,1fr)_auto]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="type-data col-span-2 flex items-center gap-2 text-[13px] font-medium text-ink-soft min-[560px]:col-span-1">
              <i aria-hidden="true" className={cn("h-2 w-2 rounded-full", KIND[row.kind].dot)} />
              {KIND[row.kind].label}
            </span>
            <span className="font-medium leading-snug text-ink">{row.label}</span>
            <span className="text-sm text-ink-soft">{row.status}</span>
          </li>
        ))}
      </ol>

      <p
        className="border-t border-rule px-4 py-3 text-sm text-ink-soft min-[560px]:px-5"
        aria-live="polite"
      >
        Showing {rows.length} {rows.length === 1 ? noun[0] : noun[1]} for this
        example order
      </p>
    </section>
  );
}
