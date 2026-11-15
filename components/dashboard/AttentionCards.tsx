"use client";

import { Button } from "@/components/ui/button";

interface AttentionItem {
  count: number;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}

function AttentionCard({ item }: { item: AttentionItem }) {
  return (
    <div className="flex flex-col rounded-none border-[1.5px] border-ink bg-sheet p-5">
      <div className="type-title text-2xl font-bold tabular-nums text-redline">{item.count}</div>
      <div className="type-title mt-1 text-sm font-bold text-ink">
        {item.title}
      </div>
      <div className="mt-0.5 text-xs text-ink-soft">{item.body}</div>
      <div className="mt-4">
        <Button size="sm" variant="secondary" onClick={item.onAction}>
          {item.actionLabel}
        </Button>
      </div>
    </div>
  );
}

// "Needs your attention" strip — only actions the dashboard actually
// supports today: claiming briefs, replying to your own, and reviewing
// drafted agent lessons.
export function AttentionCards({
  unclaimedCount,
  mineCount,
  lessonsCount,
  onViewUnclaimed,
  onViewMine,
  onOpenLessons,
}: {
  unclaimedCount: number;
  mineCount: number;
  lessonsCount: number | null;
  onViewUnclaimed: () => void;
  onViewMine: () => void;
  onOpenLessons: () => void;
}) {
  const items: AttentionItem[] = [];
  if (unclaimedCount > 0) {
    items.push({
      count: unclaimedCount,
      title: unclaimedCount === 1 ? "Unclaimed brief" : "Unclaimed briefs",
      body: "Buyers are waiting. Claim to reply",
      actionLabel: "View unclaimed",
      onAction: onViewUnclaimed,
    });
  }
  if (lessonsCount !== null && lessonsCount > 0) {
    items.push({
      count: lessonsCount,
      title:
        lessonsCount === 1
          ? "Lesson awaiting review"
          : "Lessons awaiting review",
      body: "Approve or reject drafted agent lessons",
      actionLabel: "Review now",
      onAction: onOpenLessons,
    });
  }
  if (mineCount > 0) {
    items.push({
      count: mineCount,
      title: mineCount === 1 ? "Brief assigned to you" : "Briefs assigned to you",
      body: "Buyers see your replies in realtime",
      actionLabel: "View mine",
      onAction: onViewMine,
    });
  }

  return (
    <section>
      <h2 className="type-title text-sm font-bold text-ink">
        Needs your attention
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">
          All clear. Nothing waiting on you.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <AttentionCard key={item.title} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
