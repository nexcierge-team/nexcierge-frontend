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
import {
  MOCK_CHAT_SESSIONS,
  MOCK_SUPPLIER_MATCH,
  SUGGESTED_PROMPTS,
} from "@/lib/mockData";
import type { Message } from "@/types/chat";

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function newMessageId() {
  return Math.random().toString(36).slice(2);
}

function shouldAttachSupplier(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("pet") || t.includes("bottle") || t.includes("blowing")
  );
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string>(newSessionId);
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>(
    undefined,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: newMessageId(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: trimmed }),
      });
      const data = await res.json();
      const reply =
        data.reply ?? "Sorry — something went wrong. Please try again.";
      const attachSupplier = shouldAttachSupplier(trimmed);
      const agentMsg: Message = {
        id: newMessageId(),
        role: "agent",
        content: reply,
        supplierCards: attachSupplier ? [MOCK_SUPPLIER_MATCH] : undefined,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: "agent",
          content: "Connection error. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSessionId(newSessionId());
    setActiveHistoryId(undefined);
    setMessages([]);
    setInput("");
  }

  function pickHistory(id: string) {
    setActiveHistoryId(id);
    const found = MOCK_CHAT_SESSIONS.find((s) => s.id === id);
    if (!found) return;
    // Hydrate a representative mock conversation
    setMessages([
      {
        id: newMessageId(),
        role: "user",
        content: found.title,
      },
      {
        id: newMessageId(),
        role: "agent",
        content:
          "Loaded conversation preview. Start a new conversation to continue with the live agent.",
      },
    ]);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen bg-white">
      <ChatSidebar
        activeId={activeHistoryId}
        onNew={reset}
        onSelect={pickHistory}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <Sparkles className="h-4 w-4 text-[#0066cc]" strokeWidth={1.75} />
            Sourcing concierge
          </div>
          <a
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Exit
          </a>
        </div>

        <div className="flex-1 overflow-y-auto">
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
                  <h1 className="text-center text-3xl font-semibold tracking-[-0.015em] text-zinc-900 sm:text-4xl">
                    What machinery are you sourcing?
                  </h1>
                  <p className="mt-3 text-center text-base text-zinc-500">
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
                        className="rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
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
                    <MessageBubble key={m.id} message={m} />
                  ))}
                  {loading && <TypingIndicator />}
                  <div ref={endRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isEmpty && (
          <div className="border-t border-zinc-200 bg-white px-6 py-4">
            <div className="mx-auto max-w-3xl">
              <ChatComposer
                value={input}
                onChange={setInput}
                onSubmit={() => send(input)}
                disabled={loading}
                placeholder="Reply…"
              />
              <div className="mt-2 text-center text-[11px] text-zinc-400">
                Press Enter to send · Shift + Enter for a new line
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
