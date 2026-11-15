// Instant feedback on client navigation to /dashboard while the route's
// JS loads: a neutral two-column frame (inbox list + detail) that matches
// the dashboard's shape. Static, no client hooks.
import { cn } from "@/lib/utils";

function Bar({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-ink/10", className)} />;
}

export default function Loading() {
  return (
    <div
      className="flex h-[100dvh] overflow-hidden bg-paper"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <aside className="hidden h-full w-80 shrink-0 flex-col gap-3 border-r border-rule-strong bg-paper p-4 md:flex">
        <Bar className="h-5 w-32" />
        <Bar className="mt-3 h-14 w-full rounded-sm" />
        <Bar className="h-14 w-full rounded-sm" />
        <Bar className="h-14 w-full rounded-sm" />
      </aside>
      <main className="flex-1 space-y-4 p-6 sm:p-10">
        <Bar className="h-6 w-56" />
        <Bar className="h-4 w-2/3" />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
          <Bar className="h-24 w-full rounded-none" />
          <Bar className="h-24 w-full rounded-none" />
          <Bar className="h-24 w-full rounded-none" />
        </div>
      </main>
    </div>
  );
}
