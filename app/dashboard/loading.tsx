// Instant feedback on client navigation to /dashboard while the route's
// JS loads: a neutral two-column frame (inbox list + detail) that matches
// the dashboard's shape. Static, no client hooks.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-gray-100 ${className}`} />;
}

export default function Loading() {
  return (
    <div
      className="flex h-[100dvh] overflow-hidden bg-white"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <aside className="hidden h-full w-80 shrink-0 flex-col gap-3 border-r border-gray-200 bg-[#F7F8FA] p-4 md:flex">
        <Bar className="h-5 w-32" />
        <Bar className="mt-3 h-14 w-full rounded-xl" />
        <Bar className="h-14 w-full rounded-xl" />
        <Bar className="h-14 w-full rounded-xl" />
      </aside>
      <main className="flex-1 space-y-4 p-6 sm:p-10">
        <Bar className="h-6 w-56" />
        <Bar className="h-4 w-2/3" />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
          <Bar className="h-24 w-full rounded-2xl" />
          <Bar className="h-24 w-full rounded-2xl" />
          <Bar className="h-24 w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
