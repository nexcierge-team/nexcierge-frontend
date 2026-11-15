"use client";

import { ChevronDown, Languages, Loader2 } from "lucide-react";

// Header control letting the AM read the whole thread in their working
// language. "" = original only; "en"/"zh"/"hi" translate every message
// and show the translation under each original. The choice is global
// (lifted to DashboardPage + persisted), so it sticks across briefs.
export function LanguageSelector({
  value,
  onChange,
  translating,
}: {
  value: string;
  onChange: (lang: string) => void;
  translating: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {translating && (
        <Loader2
          className="h-3.5 w-3.5 animate-spin text-ink-soft"
          strokeWidth={1.75}
          aria-label="Translating…"
        />
      )}
      <label className="relative inline-flex items-center">
        <Languages
          className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-soft"
          strokeWidth={1.75}
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Read this thread in"
          className="appearance-none rounded-sm border border-rule-strong bg-white py-1.5 pl-8 pr-7 text-xs font-semibold text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-blueprint/30"
        >
          <option value="">Original only</option>
          <option value="en">English</option>
          <option value="zh">中文 (Chinese)</option>
          <option value="hi">हिन्दी (Hindi)</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-soft"
          strokeWidth={1.75}
        />
      </label>
    </div>
  );
}
