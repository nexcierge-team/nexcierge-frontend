"use client";

import { useState } from "react";
import {
  BadgeCheck,
  FileText,
  Search,
  UserCheck,
  UserRound,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { RfqTable, type BriefTab } from "./RfqTable";
import { AttentionCards } from "./AttentionCards";
import { claimStatus, inboxRfq, type InboxBrief } from "./types";

// Overview landing view: headline stats, the full briefs table, and an
// actionable "needs your attention" strip. Everything is derived
// client-side from the inbox payload — no extra endpoints.
export function OverviewPane({
  briefs,
  loading,
  meId,
  lessonsCount,
  onSelectBrief,
  onOpenLessons,
}: {
  briefs: InboxBrief[];
  loading: boolean;
  meId: string | null;
  lessonsCount: number | null;
  onSelectBrief: (sessionId: string) => void;
  onOpenLessons: () => void;
}) {
  const [tab, setTab] = useState<BriefTab>("all");
  const [query, setQuery] = useState("");

  const unclaimed = briefs.filter(
    (b) => claimStatus(b, meId) === "unclaimed",
  ).length;
  const mine = briefs.filter((b) => claimStatus(b, meId) === "mine").length;
  const inHubspot = briefs.filter(
    (b) => inboxRfq(b)?.hubspot_deal_id,
  ).length;

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="type-display text-2xl font-extrabold text-ink">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Here&apos;s what&apos;s happening with your sourcing briefs
              today.
            </p>
          </div>
          <label className="relative block w-full max-w-xs">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search briefs, buyers…"
              className="w-full rounded-sm border border-rule-strong bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-gray-400 transition-colors focus:border-ink focus:outline-none focus:ring-2 focus:ring-blueprint/30"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Open briefs"
            value={briefs.length}
            icon={FileText}
            tone="navy"
            hint="In handoff right now"
          />
          <StatCard
            label="Unclaimed"
            value={unclaimed}
            icon={UserRound}
            tone="amber"
            hint="Need an owner"
          />
          <StatCard
            label="Assigned to me"
            value={mine}
            icon={UserCheck}
            tone="emerald"
            hint="Your active conversations"
          />
          <StatCard
            label="In HubSpot"
            value={inHubspot}
            icon={BadgeCheck}
            tone="gray"
            hint="Synced as CRM deals"
          />
        </div>

        <div className="mt-6">
          <RfqTable
            briefs={briefs}
            loading={loading}
            meId={meId}
            tab={tab}
            onTabChange={setTab}
            query={query}
            onSelect={onSelectBrief}
          />
        </div>

        <div className="mt-8 pb-4">
          <AttentionCards
            unclaimedCount={unclaimed}
            mineCount={mine}
            lessonsCount={lessonsCount}
            onViewUnclaimed={() => setTab("unclaimed")}
            onViewMine={() => setTab("mine")}
            onOpenLessons={onOpenLessons}
          />
        </div>
      </div>
    </div>
  );
}
