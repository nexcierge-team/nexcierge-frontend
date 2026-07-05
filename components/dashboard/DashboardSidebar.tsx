"use client";

import Link from "next/link";
import {
  GraduationCap,
  LayoutDashboard,
  SlidersHorizontal,
} from "lucide-react";
import { AccountMenu } from "@/components/auth/AccountMenu";
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
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 border-b border-gray-200 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F2747] text-sm font-semibold text-white">
          N
        </span>
        <div className="min-w-0">
          <Link
            href="/"
            className="block font-semibold tracking-[0.16em] text-[13px] text-gray-900"
          >
            NEXCIERGE
          </Link>
          <p className="text-[11px] text-gray-400">Account Manager</p>
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
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors",
                    isActive
                      ? "bg-[#DCE8F8]/60 text-[#0F2747]"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-[#0F2747]" : "text-gray-400",
                      )}
                      strokeWidth={1.75}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        isActive ? "font-medium" : "font-normal",
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        isActive
                          ? "bg-[#0F2747] text-white"
                          : "bg-gray-100 text-gray-600",
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

      <div className="border-t border-gray-200 px-5 py-4">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
          Account manager
        </div>
        <AccountMenu variant="compact" redirectTo="/dashboard" />
      </div>
    </aside>
  );
}
