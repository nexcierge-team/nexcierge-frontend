"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icon-chip tones stay inside the palette: powder blue for the
// brand/AI-flavoured stat, functional Tailwind tints for the rest.
const TONE = {
  navy: "bg-[#DCE8F8] text-[#0F2747]",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  gray: "bg-gray-100 text-gray-600",
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-500">{label}</div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            TONE[tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mt-1 text-3xl font-semibold tracking-[-0.01em] text-gray-900">
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
