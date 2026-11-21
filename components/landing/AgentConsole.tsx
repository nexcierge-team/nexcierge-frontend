"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { LANDING_SEED_KEY, LANDING_SEED_MAX } from "@/lib/constants";
import {
  AGENT,
  CONSOLE_COPY,
  CONSOLE_LANGS,
  type ConsoleLang,
} from "@/lib/landingContent";
import { cn } from "@/lib/utils";
import { SEG, SEG_BTN } from "./styles";

const PANEL = "min-w-0 border border-rule-strong bg-sheet";
const BAR =
  "flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3";

export function AgentConsole() {
  const router = useRouter();
  const [lang, setLang] = useState<ConsoleLang>("en");
  const copy = CONSOLE_COPY[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const warm = () => router.prefetch("/chat");

  // Starter chips are canned strings, so they can ride in the URL like
  // the homepage always has.
  function sendChip(text: string) {
    router.push(`/chat?new=1&seed=${encodeURIComponent(text)}`);
  }

  // Typed text is the buyer's own words. Hand it to /chat through
  // sessionStorage so it never appears in a URL (browser history, server
  // logs, analytics URL properties). If storage is unavailable (private
  // mode quotas), fall back to opening the chat empty: keep the text in
  // the box by returning false so nothing is lost silently.
  function sendTyped(text: string) {
    const message = text.trim().slice(0, LANDING_SEED_MAX);
    if (!message) return false;
    try {
      window.sessionStorage.setItem(LANDING_SEED_KEY, message);
    } catch {
      return false;
    }
    router.push("/chat?new=1");
  }

  return (
    <div className="min-w-0">
      <div className={cn(PANEL, "grid")}>
        <div className={BAR}>
          <span className="type-title font-semibold">{AGENT.agentName}</span>
          <div className={SEG} role="group" aria-label="Conversation language">
            {CONSOLE_LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                aria-pressed={lang === l.code}
                aria-label={l.name}
                lang={l.code}
                onClick={() => setLang(l.code)}
                className={SEG_BTN}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div
          dir={dir}
          lang={lang}
          className="flex min-h-[220px] flex-col gap-3 bg-white px-4 py-5 min-[960px]:min-h-[260px]"
        >
          <p className="max-w-[88%] self-start rounded-[2px_12px_12px_12px] bg-paper px-4 py-3 leading-[1.5] rtl:rounded-[12px_2px_12px_12px]">
            {copy.greeting}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {copy.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendChip(chip)}
                onPointerEnter={warm}
                onFocus={warm}
                className="min-h-11 rounded-full border border-rule-strong bg-white px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:border-ink hover:bg-paint/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint motion-reduce:active:scale-100"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div
          dir={dir}
          lang={lang}
          className="border-t border-rule px-4 pb-4 pt-3"
          onPointerEnter={warm}
          onFocus={warm}
        >
          <ChatComposer
            key={lang}
            onSubmit={sendTyped}
            placeholder={copy.placeholder}
            language={lang}
            rows={1}
          />
          <p className="mt-2 text-[13px] text-ink-soft" dir="ltr" lang="en">
            {AGENT.hint}
          </p>
        </div>
      </div>

    </div>
  );
}
