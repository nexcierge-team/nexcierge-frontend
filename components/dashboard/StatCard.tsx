"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icon-chip tones stay inside the palette: powder blue for the
// brand/AI-flavoured stat, functional Tailwind tints for the rest.
const TONE = {
  navy: "bg-blueprint/12 text-blueprint ring-1 ring-inset ring-blueprint/30",
  amber: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-700/30",
  emerald: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-700/30",
  gray: "bg-ink/10 text-ink-soft ring-1 ring-inset ring-ink/20",
} as const;

export type StatTone = keyof typeof TONE;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: StatTone;
  hint?: string;
}) {
  return (
    <div className="rounded-none border-[1.5px] border-ink bg-sheet p-5">
      <div className="flex items-start justify-between">
        <div className="type-data text-sm font-semibold text-ink-soft">{label}</div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            TONE[tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="type-title mt-1 text-3xl font-bold tabular-nums text-ink">
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}
