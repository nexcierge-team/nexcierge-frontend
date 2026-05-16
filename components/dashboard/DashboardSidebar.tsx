"use client";

import Link from "next/link";
import {
  FileText,
  Inbox,
  MessageSquare,
  Settings,
  Users,
  Receipt,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "requests", label: "Requests", icon: Inbox, count: 4 },
  { id: "quotes", label: "Quotes", icon: Receipt, count: 3 },
  { id: "suppliers", label: "Suppliers", icon: Users, count: 8 },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "messages", label: "Messages", icon: MessageSquare, count: 2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const [active, setActive] = useState("requests");

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-[#fbfbfd] md:flex">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
        <Link
          href="/"
          className="font-semibold tracking-[0.16em] text-[14px] text-zinc-900"
        >
          NEXCIERGE
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActive(item.id)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors",
                    isActive
                      ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "hover:bg-white/60",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-zinc-900" : "text-zinc-400",
                      )}
                      strokeWidth={1.5}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        isActive
                          ? "font-medium text-zinc-900"
                          : "text-zinc-700",
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                  {item.count !== undefined && (
                    <span className="text-xs text-zinc-400">{item.count}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-200 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-medium text-white">
            AC
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-zinc-900">
              Acme Industrial
            </div>
            <div className="truncate text-xs text-zinc-400">
              procurement@acme.example
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
