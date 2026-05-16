"use client";

import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_CHAT_SESSIONS } from "@/lib/mockData";

interface ChatSidebarProps {
  activeId?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
}

export function ChatSidebar({ activeId, onNew, onSelect }: ChatSidebarProps) {
  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-[#fbfbfd] md:flex">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
        <Link
          href="/"
          className="font-semibold tracking-[0.16em] text-[14px] text-zinc-900"
        >
          NEXCIERGE
        </Link>
        <button
          onClick={onNew}
          aria-label="New conversation"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
          Conversations
        </div>
        <ul className="space-y-0.5">
          {MOCK_CHAT_SESSIONS.map((s) => {
            const active = s.id === activeId;
            return (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "hover:bg-white/60",
                  )}
                >
                  <MessageSquare
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      active ? "text-zinc-900" : "text-zinc-400",
                    )}
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "truncate text-sm",
                        active
                          ? "font-medium text-zinc-900"
                          : "text-zinc-700",
                      )}
                    >
                      {s.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-zinc-400">
                      {s.preview}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-zinc-200 p-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-medium uppercase text-white">
            NX
          </div>
          <div>
            <div className="text-zinc-900">Demo workspace</div>
            <div className="text-zinc-400">Free trial</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
