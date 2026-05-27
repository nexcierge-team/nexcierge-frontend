"use client";

import { FormEvent, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  rows?: number;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  autoFocus,
  rows = 1,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [value]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && value.trim()) onSubmit();
          }
        }}
        placeholder={placeholder ?? "Message Nexcierge…"}
        rows={rows}
        className={cn(
          // text-base (16px) below sm: prevents iOS Safari from auto-zooming
          // when the textarea is focused — anything <16px triggers the zoom.
          // Desktop keeps the original tighter 15px.
          "w-full resize-none rounded-2xl border border-gray-200 bg-white px-5 py-3.5 pr-14 text-base text-gray-900 placeholder:text-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors focus:border-gray-400 focus:outline-none sm:text-[15px]",
          // Hide the textarea's scrollbar (auto-resize handles vertical growth up to max-height)
          "scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        )}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="absolute right-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm transition-all duration-200 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2} />
      </button>
    </form>
  );
}
