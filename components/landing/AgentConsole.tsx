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

interface AgentConsoleProps {
  fileLabels: { en: string[]; zh: string[] };
}

const PANEL = "border-[1.5px] border-ink bg-sheet";
const BAR =
  "flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-ink px-3.5 py-3";

export function AgentConsole({ fileLabels }: AgentConsoleProps) {
  const router = useRouter();
  const [lang, setLang] = useState<ConsoleLang>("en");
  const [view, setView] = useState<"en" | "zh">("en");
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
    <div className="grid items-start gap-4 min-[960px]:grid-cols-2 min-[960px]:gap-6">
      <div className={cn(PANEL, "grid")}>
        <div className={BAR}>
          <span className="type-title font-extrabold">{AGENT.agentName}</span>
          <div className={SEG} role="group" aria-label="Conversation language">
            {CONSOLE_LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                aria-pressed={lang === l.code}
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
          className="bg-ruled flex min-h-[220px] flex-col gap-2.5 px-3.5 py-4 min-[960px]:min-h-[260px]"
        >
          <p className="max-w-[86%] self-start rounded-[2px_12px_12px_12px] border border-ink bg-white px-[13px] py-2.5 leading-[1.4] rtl:rounded-[12px_2px_12px_12px]">
            {copy.greeting}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-3">
            {copy.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendChip(chip)}
                onPointerEnter={warm}
                onFocus={warm}
                className="min-h-[42px] rounded-full border-[1.5px] border-ink bg-white px-[15px] py-[9px] text-[15px] font-semibold transition-colors hover:bg-paint active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div
          dir={dir}
          className="border-t border-rule-strong px-3.5 pb-3.5 pt-3"
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
          <p className="type-data mt-2 text-[13px] font-semibold text-ink-soft" dir="ltr">
            {AGENT.hint}
          </p>
        </div>
      </div>

      <aside className={PANEL} aria-label={AGENT.fileTitle}>
        <header className={BAR}>
          <strong className="type-title font-extrabold">
            {AGENT.fileTitle}
          </strong>
          <div className={SEG} role="group" aria-label="File language">
            <button
              type="button"
              aria-pressed={view === "en"}
              onClick={() => setView("en")}
              className={SEG_BTN}
            >
              English
            </button>
            <button
              type="button"
              aria-pressed={view === "zh"}
              onClick={() => setView("zh")}
              className={SEG_BTN}
            >
              中文
            </button>
          </div>
        </header>
        <dl>
          {fileLabels[view].map((label, i) => (
            <div
              key={fileLabels.en[i]}
              className="grid grid-cols-[minmax(96px,38%)_1fr] border-b border-rule"
            >
              <dt className="border-r border-rule px-3 py-2.5 text-ink-soft">
                {label}
              </dt>
              <dd className="flex min-h-11 items-center px-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="block h-px w-12 bg-rule-strong"
                />
                <span className="sr-only">Not filled in yet</span>
              </dd>
            </div>
          ))}
        </dl>
        <footer className="grid gap-1 px-3.5 py-3">
          <span className="type-data text-sm font-semibold">
            {AGENT.fileStatus}
          </span>
          <span className="text-sm text-ink-soft">{AGENT.fileNote}</span>
        </footer>
      </aside>
    </div>
  );
}
