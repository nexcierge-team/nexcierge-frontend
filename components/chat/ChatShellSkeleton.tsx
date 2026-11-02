// Static placeholder for the chat page's layout: sidebar (md+), header,
// a few message lines, a disabled composer, progress rail (xl+). Rendered
// as the /chat Suspense fallback (so it's in the prerendered HTML and
// paints before any JS runs) and by app/chat/loading.tsx during client
// navigation. No client hooks, no motion, safe as a Server Component.
// Widths mirror ChatSidebar (md:w-72) and SourcingProgressRail (xl:w-80)
// so nothing jumps when the real page hydrates.

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-gray-100 ${className}`} />;
}

export function ChatShellSkeleton() {
  return (
    <div
      className="flex h-[100dvh] overflow-hidden bg-white"
      aria-busy="true"
      aria-label="Loading chat"
    >
      <aside className="hidden h-full w-72 shrink-0 flex-col gap-3 border-r border-gray-200 bg-[#F7F8FA] p-4 md:flex">
        <Bar className="h-9 w-full rounded-xl" />
        <Bar className="mt-4 h-3 w-24" />
        <Bar className="h-8 w-full rounded-lg" />
        <Bar className="h-8 w-full rounded-lg" />
        <Bar className="h-8 w-3/4 rounded-lg" />
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 pt-safe sm:px-6">
          <div className="flex items-center gap-2 py-4 text-sm font-medium text-gray-900">
            <span className="truncate">Sourcing concierge</span>
          </div>
          <Bar className="h-4 w-10" />
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
            <div className="flex justify-end">
              <Bar className="h-10 w-2/5 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Bar className="h-4 w-4/5" />
              <Bar className="h-4 w-3/5" />
              <Bar className="h-4 w-2/5" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white pb-safe">
          <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6 sm:py-4">
            <div className="h-[52px] w-full rounded-2xl border border-gray-200 bg-gray-50" />
          </div>
        </div>
      </div>

      <aside className="hidden h-full w-80 shrink-0 flex-col gap-3 border-l border-gray-200 p-5 xl:flex">
        <Bar className="h-3 w-28" />
        <Bar className="h-5 w-3/4" />
        <Bar className="mt-4 h-4 w-full" />
        <Bar className="h-4 w-5/6" />
        <Bar className="h-4 w-2/3" />
      </aside>
    </div>
  );
}
