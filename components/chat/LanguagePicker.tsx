"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, getLanguageOption } from "@/lib/languages";

interface LanguagePickerProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

// Lightweight dropdown for the chat header. Shows the currently
// selected language's native name + a globe glyph so non-English buyers
// can find it without reading "Language". Click-outside closes the
// panel; Escape closes it too.
export function LanguagePicker({
  value,
  onChange,
  disabled = false,
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = getLanguageOption(value);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50",
          disabled && "opacity-50 cursor-not-allowed hover:bg-white hover:border-gray-200",
        )}
      >
        <Languages className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
        <span>{current.nativeName}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-2 max-h-80 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = lang.code === value;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setOpen(false);
                  if (lang.code !== value) onChange(lang.code);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50",
                  selected ? "text-gray-900" : "text-gray-700",
                )}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{lang.nativeName}</span>
                  {lang.nativeName !== lang.englishName && (
                    <span className="text-[11px] text-gray-400">
                      {lang.englishName}
                    </span>
                  )}
                </span>
                {selected && (
                  <Check className="h-4 w-4 text-[#0F2747]" strokeWidth={2} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
