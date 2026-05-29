"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useChat } from "@/lib/useChat";
import { ChatComposer } from "@/components/chat/ChatComposer";
import {
  MessageBubble,
  TypingIndicator,
} from "@/components/chat/MessageBubble";
import { AuthModal } from "@/components/auth/AuthModal";
import { SUGGESTED_PROMPTS } from "@/lib/mockData";

interface HeroChatModalProps {
  open: boolean;
  initialMessage?: string;
  onClose: () => void;
}

export function HeroChatModal({
  open,
  initialMessage,
  onClose,
}: HeroChatModalProps) {
  const {
    messages,
    loading,
    sendMessage,
    retry,
    reviewRequested,
    reviewSubmitting,
    requestReview,
    authPromptOpen,
    dismissAuthPrompt,
    otherIsTyping,
    notifyTyping,
    language,
  } = useChat({ forceNew: true });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitialRef = useRef(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fire initial message once when the modal opens with one
  useEffect(() => {
    if (open && initialMessage && !sentInitialRef.current) {
      sentInitialRef.current = true;
      sendMessage(initialMessage);
    }
    if (!open) {
      sentInitialRef.current = false;
    }
  }, [open, initialMessage, sendMessage]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  function handleSubmit() {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput("");
  }

  const isEmpty = messages.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 p-4 backdrop-blur-md sm:p-6"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[88vh] max-h-[720px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Sparkles
                  className="h-4 w-4 text-[#0F2747]"
                  strokeWidth={1.75}
                />
                Sourcing concierge
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/chat"
                  className="hidden items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-900 sm:flex"
                >
                  Open full view
                  <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                </Link>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                    What machinery are you sourcing?
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-500">
                    Describe what you need in your own words. The agent will
                    qualify the requirements.
                  </p>

                  <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {SUGGESTED_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        disabled={loading}
                        className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
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
                          ? sendMessage
                          : undefined
                      }
                    />
                  ))}
                  {(loading || otherIsTyping) && <TypingIndicator />}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <ChatComposer
                value={input}
                onChange={(v) => {
                  setInput(v);
                  if (v) notifyTyping();
                }}
                onSubmit={handleSubmit}
                disabled={loading}
                placeholder={
                  reviewRequested
                    ? "Message your account manager…"
                    : "Message Nexcierge…"
                }
                autoFocus
              />
              <div className="mt-2 text-center text-[11px] text-gray-400">
                Press Enter to send · Esc to close
              </div>
            </div>
          </motion.div>
          <AuthModal open={authPromptOpen} onClose={dismissAuthPrompt} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
