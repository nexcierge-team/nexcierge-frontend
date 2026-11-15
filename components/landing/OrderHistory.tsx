"use client";

import { useState } from "react";
import { ACCOUNT, type HistoryKind } from "@/lib/landingContent";
import { cn } from "@/lib/utils";
import { SEG, SEG_BTN, TAG } from "./styles";

const KIND_TAG: Record<HistoryKind, string> = {
  chat: "bg-ink text-sheet",
  doc: "",
  pay: "bg-paint",
};

type Filter = "all" | HistoryKind;

// An illustrative order timeline (clearly labelled "Example"), filterable
// by what kind of record each row is.
export function OrderHistory() {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = ACCOUNT.history.filter(
    (r) => filter === "all" || r.kind === filter,
  );
  const noun = ACCOUNT.filters.find((f) => f.key === filter)!.noun;

  return (
    <div
      className="border-[1.5px] border-ink bg-sheet"
      aria-label="Example order history"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 border-b-[1.5px] border-ink px-3.5 py-3">
        <strong className="type-title font-extrabold">
          {ACCOUNT.panelTitle}
          <em className="type-data ml-2 border border-ink bg-paint px-1.5 py-0.5 text-xs font-bold not-italic">
            Example
          </em>
        </strong>
        <div className={SEG} role="group" aria-label="Show">
          {ACCOUNT.filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={SEG_BTN}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-0.5 border-b border-rule-strong px-3.5 py-3">
        <span className="type-data text-sm font-medium text-ink-soft">
          {ACCOUNT.orderLabel}
        </span>
        <b className="leading-tight [font-stretch:106%]">{ACCOUNT.orderName}</b>
      </div>

      {/* Keyed on the filter so the rows replay their entrance on change. */}
      <ol key={filter}>
        {rows.map((row, i) => (
          <li
            key={row.label}
            className="row-in grid min-h-[50px] grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule px-3.5 py-[11px] leading-[1.3]"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className={cn(TAG, KIND_TAG[row.kind])}>{row.tag}</span>
            <span className="font-semibold">{row.label}</span>
            <span className="type-data text-sm font-medium text-ink-soft">
              {row.status}
            </span>
          </li>
        ))}
      </ol>

      <p className="type-data px-3.5 py-2.5 text-sm font-medium text-ink-soft" aria-live="polite">
        Showing {rows.length} {rows.length === 1 ? noun[0] : noun[1]} for this
        example order
      </p>
    </div>
  );
}
