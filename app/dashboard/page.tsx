import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { RequestCard } from "@/components/dashboard/RequestCard";
import { MOCK_REQUESTS } from "@/lib/mockData";

const STATS = [
  { label: "Active requests", value: "4" },
  { label: "Open quotes", value: "3" },
  { label: "Verified suppliers", value: "8" },
  { label: "Avg. time to shortlist", value: "2.1 days" },
];

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-white">
      <DashboardSidebar />

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/85 backdrop-blur-xl">
          <div className="flex items-center justify-between px-8 py-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                Sourcing requests
              </h1>
              <p className="text-sm text-zinc-500">
                Track active sourcing workflows and supplier matches.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
                <input
                  placeholder="Search requests"
                  className="h-10 w-64 rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <Button asChild size="sm">
                <Link href="/chat">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  New request
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="px-8 py-8">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-5"
              >
                <div className="text-xs text-zinc-500">{s.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                  {s.value}
                </div>
              </div>
            ))}
          </section>

          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-400">
                Recent requests
              </h2>
              <Link
                href="/chat"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {MOCK_REQUESTS.map((r) => (
                <RequestCard key={r.id} request={r} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
