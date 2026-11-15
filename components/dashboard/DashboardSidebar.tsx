"use client";

import Link from "next/link";
import {
  GraduationCap,
  LayoutDashboard,
  SlidersHorizontal,
} from "lucide-react";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { Wordmark } from "@/components/layout/Wordmark";
import { cn } from "@/lib/utils";

export type DashboardView = "overview" | "lessons" | "models";

const NAV: {
  id: DashboardView;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "lessons", label: "Lessons", icon: GraduationCap },
  { id: "models", label: "Models", icon: SlidersHorizontal },
];

// Left navigation rail. Views are mutually exclusive; an open brief
// keeps Overview highlighted since briefs are reached from there.
export function DashboardSidebar({
  active,
  onNavigate,
  inboxCount,
  lessonsCount,
}: {
  active: DashboardView;
  onNavigate: (view: DashboardView) => void;
  inboxCount: number;
  lessonsCount: number | null;
}) {
  const badge: Partial<Record<DashboardView, number>> = {
    overview: inboxCount,
    ...(lessonsCount ? { lessons: lessonsCount } : {}),
  };

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-rule-strong bg-paper md:flex">
      <div className="flex items-center gap-2.5 border-b border-rule-strong px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center type-display rounded-sm bg-ink text-sm font-extrabold text-sheet">
          N
        </span>
        <div className="min-w-0">
          <Link
            href="/"
            className="block leading-tight"
          >
            <Wordmark className="text-[15px]" />
          </Link>
          <p className="type-data text-[11px] font-semibold text-ink-soft">Account Manager</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const isActive = active === item.id;
            const count = badge[item.id];
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint",
                    isActive
                      ? "bg-ink text-sheet"
                      : "text-gray-700 hover:bg-ink/10 hover:text-ink",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-paint" : "text-gray-500",
                      )}
                      strokeWidth={1.75}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        isActive ? "font-semibold" : "font-normal",
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        "type-data rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        isActive
                          ? "bg-paint text-ink"
                          : "bg-ink/10 text-ink",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-rule-strong px-5 py-4">
        <div className="type-data mb-1 text-[11px] font-semibold text-ink-soft">
          Account manager
        </div>
        <AccountMenu variant="compact" redirectTo="/dashboard" />
      </div>
    </aside>
  );
}
