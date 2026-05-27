"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { LanguagePicker } from "@/components/chat/LanguagePicker";
import {
  MessageBubble,
  TypingIndicator,
} from "@/components/chat/MessageBubble";
import { AuthModal } from "@/components/auth/AuthModal";
import { SUGGESTED_PROMPTS } from "@/lib/mockData";
import { useChat } from "@/lib/useChat";

export default function ChatPage() {
  // useSearchParams forces client-side rendering for this route, so we
  // wrap the inner component in Suspense to satisfy Next's CSR-bailout
  // requirement during static prerendering. The fallback is intentionally
  // empty — the page renders instantly on the client anyway.
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  // Category cards on the homepage send users here with
  // `?seed=<prompt>&new=1` to start a fresh chat pre-filled with the
  // category they picked. We use next/navigation's useSearchParams so
  // the values are correct on both SSR and client (window.location is
  // only available on the client, and a useMemo guarded with
  // `typeof window` returns stale nulls after hydration).
  const searchParams = useSearchParams();
  // Freeze entry on the first render so stripping the params later
  // doesn't flip forceNew back to false and re-trigger bootstrap.
  const [entry] = useState(() => ({
    seed: searchParams.get("seed"),
    forceNew: searchParams.get("new") === "1",
  }));

  const {
    sessionId,
    messages,
    loading,
    bootstrapping,
    reviewRequested,
    reviewSubmitting,
    bootstrapError,
    authPromptOpen,
    dismissAuthPrompt,
    otherIsTyping,
    notifyTyping,
    sendMessage,
    retry,
    requestReview,
    switchSession,
    language,
    setLanguage,
  } = useChat({ forceNew: entry.forceNew });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const seedSentRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-send the seed once the session is bootstrapped and still empty.
  // We strip the query params after sending so a refresh doesn't replay
  // the seed into a new session.
  useEffect(() => {
    if (seedSentRef.current) return;
    if (!entry.seed) return;
    // Wait for bootstrap to fully resolve — sessionId becomes truthy
    // partway through, but bootstrapping=false is the all-clear that
    // sendMessage's internal `!sessionId` guard will pass.
    if (bootstrapping || !sessionId) return;
    if (messages.length > 0) return;
    seedSentRef.current = true;
    void sendMessage(entry.seed);
    const url = new URL(window.location.href);
    url.searchParams.delete("seed");
    url.searchParams.delete("new");
    const q = url.searchParams.toString();
    window.history.replaceState(
      {},
      "",
      url.pathname + (q ? `?${q}` : ""),
    );
  }, [entry.seed, bootstrapping, sessionId, messages.length, sendMessage]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    await sendMessage(trimmed);
  }

  // Sidebar swaps conversations in-place via useChat.switchSession —
  // it updates the URL with history.pushState (so refresh + back-button
  // still work) and re-runs the bootstrap effect against the new
  // session_id. No full page reload, no welcome-state flash.
  // Hide the welcome screen while bootstrapping so the initial load
  // (and every subsequent switch) doesn't flash the empty-state UI
  // before the real messages arrive.
  const isEmpty = !bootstrapping && messages.length === 0 && !bootstrapError;

  return (
    <div className="flex h-screen bg-white">
      <ChatSidebar
        activeId={sessionId ?? undefined}
        onNew={(id) => switchSession(id)}
        onSelect={(id) => switchSession(id)}
        onDeleteActive={() => {
          // Active conversation was deleted — fall back to "newest
          // active or create one" by switching with no session_id.
          switchSession(null);
        }}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Sparkles className="h-4 w-4 text-[#0F2747]" strokeWidth={1.75} />
            Sourcing concierge
          </div>
          <div className="flex items-center gap-3">
            <LanguagePicker
              value={language}
              onChange={setLanguage}
              disabled={!sessionId}
            />
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Exit
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {bootstrapError ? (
            <div className="mx-auto flex h-full max-w-2xl items-center justify-center px-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-900">
                {bootstrapError}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {isEmpty ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6"
                >
                  <div className="w-full">
                    <h1 className="text-center text-3xl font-semibold tracking-[-0.015em] text-gray-900 sm:text-4xl">
                      What machinery are you sourcing?
                    </h1>
                    <p className="mt-3 text-center text-base text-gray-500">
                      Describe what you need in your own words. The agent will
                      qualify the requirements.
                    </p>

                    <div className="mt-10">
                      <ChatComposer
                        value={input}
                        onChange={(v) => {
                        setInput(v);
                        if (v) notifyTyping();
                      }}
                        onSubmit={() => send(input)}
                        placeholder="Tell us what machinery you're looking for…"
                        disabled={loading}
                        autoFocus
                        rows={2}
                      />
                    </div>

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {SUGGESTED_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => send(p)}
                          disabled={loading}
                          className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mx-auto max-w-3xl px-6 py-10"
                >
                  <div className="space-y-5">
                    {messages.map((m, i) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        reviewRequested={reviewRequested}
                        reviewSubmitting={reviewSubmitting}
                        onRequestReview={requestReview}
                        onRetry={retry}
                        retryDisabled={loading}
                        sessionLanguage={language}
                        onSuggestion={
                          i === messages.length - 1 && !loading
                            ? send
                            : undefined
                        }
                      />
                    ))}
                    {(loading || otherIsTyping) && <TypingIndicator />}
                    <div ref={endRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {!isEmpty && !bootstrapError && (
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <div className="mx-auto max-w-3xl">
              <ChatComposer
                value={input}
                onChange={setInput}
                onSubmit={() => send(input)}
                disabled={loading}
                placeholder={
                  reviewRequested
                    ? "Message your account manager…"
                    : "Reply…"
                }
              />
              <div className="mt-2 text-center text-[11px] text-gray-400">
                Press Enter to send · Shift + Enter for a new line
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModal open={authPromptOpen} onClose={dismissAuthPrompt} />
    </div>
  );
}
