"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import {
  MessageBubble,
  TypingIndicator,
} from "@/components/chat/MessageBubble";
import { AuthModal } from "@/components/auth/AuthModal";
import { SUGGESTED_PROMPTS } from "@/lib/mockData";
import { useChat } from "@/lib/useChat";

export default function ChatPage() {
  const {
    sessionId,
    messages,
    loading,
    reviewRequested,
    reviewSubmitting,
    bootstrapError,
    authPromptOpen,
    dismissAuthPrompt,
    sendMessage,
    retry,
    requestReview,
  } = useChat();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    await sendMessage(trimmed);
  }

  // Both sidebar handlers do a full navigation — we let the next-page
  // mount re-bootstrap via /api/chat/start?session_id=. Simpler than
  // teaching useChat to swap sessions in place, and aligns with the
  // browser-back behaviour users expect from a "conversations" list.
  function openSession(id: string) {
    window.location.href = `/chat?session_id=${encodeURIComponent(id)}`;
  }

  const isEmpty = messages.length === 0 && !bootstrapError;

  return (
    <div className="flex h-screen bg-white">
      <ChatSidebar
        activeId={sessionId ?? undefined}
        onNew={openSession}
        onSelect={openSession}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Sparkles className="h-4 w-4 text-[#0F2747]" strokeWidth={1.75} />
            Sourcing concierge
          </div>
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Exit
          </a>
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
                        onChange={setInput}
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
                    {messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        reviewRequested={reviewRequested}
                        reviewSubmitting={reviewSubmitting}
                        onRequestReview={requestReview}
                        onRetry={retry}
                        retryDisabled={loading}
                      />
                    ))}
                    {loading && <TypingIndicator />}
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
