// Buyer sidebar filtering + grouping for the request list. Pure.
//
// Status buckets collapse (status, sourcing_stage) into what a buyer
// actually asks of their list: which briefs are still being written,
// which are being worked by Nexcierge, which are finished.

import type { SidebarSession } from "@/lib/useSessionsList";

export type RequestFilter = "all" | "draft" | "active" | "done";

export const REQUEST_FILTERS: RequestFilter[] = ["all", "draft", "active", "done"];

export function requestBucket(s: Pick<SidebarSession, "status" | "sourcing_stage">): Exclude<RequestFilter, "all"> {
  if (s.status === "ai") return "draft";
  if (s.status === "closed" || s.sourcing_stage === "delivered") return "done";
  return "active";
}

export function matchesFilter(s: SidebarSession, f: RequestFilter): boolean {
  return f === "all" || requestBucket(s) === f;
}

export function filterCounts(
  sessions: SidebarSession[],
): Record<RequestFilter, number> {
  const out: Record<RequestFilter, number> = { all: 0, draft: 0, active: 0, done: 0 };
  for (const s of sessions) {
    out.all++;
    out[requestBucket(s)]++;
  }
  return out;
}

export type DateGroup = "today" | "week" | "month" | "older";

const DAY_MS = 86_400_000;

// ChatGPT-style recency buckets on updated_at, local calendar days.
export function dateGroup(iso: string, now = new Date()): DateGroup {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "older";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t.getTime() >= startOfToday) return "today";
  if (t.getTime() >= startOfToday - 6 * DAY_MS) return "week";
  if (t.getTime() >= startOfToday - 29 * DAY_MS) return "month";
  return "older";
}

// Sessions arrive sorted most-recent first, so groups come out in order.
export function groupByDate(
  sessions: SidebarSession[],
): { group: DateGroup; items: SidebarSession[] }[] {
  const now = new Date();
  const out: { group: DateGroup; items: SidebarSession[] }[] = [];
  for (const s of sessions) {
    const g = dateGroup(s.updated_at, now);
    const last = out[out.length - 1];
    if (last && last.group === g) last.items.push(s);
    else out.push({ group: g, items: [s] });
  }
  return out;
}
