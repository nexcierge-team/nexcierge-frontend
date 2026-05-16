"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

type Message = {
  role: "user" | "agent";
  content: string;
};

const SUGGESTIONS = [
  "CNC lathe for stainless steel parts",
  "PET bottle blowing machine",
  "Injection molding machine, 200-ton clamping",
  "Fiber laser cutter for 12mm steel",
];

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(newSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
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
      setMessages((prev) => [...prev, { role: "agent", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "Connection error. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col flex-1">
      {isEmpty ? (
        <div className="flex flex-col flex-1 items-center justify-center px-6 w-full">
          <div className="w-full max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 tracking-tight mb-3 text-center">
              The smart way to source equipment
            </h1>
            <p className="text-zinc-500 mb-10 text-center text-base sm:text-lg">
              AI-powered industrial machinery sourcing, direct from Chinese
              manufacturers.
            </p>

            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={handleSubmit}
              onSend={sendMessage}
              loading={loading}
              placeholder="Tell us what machinery you're looking for..."
              rows={3}
            />

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  className="text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors rounded-full px-3 py-1.5 border border-zinc-200 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 text-zinc-500 rounded-2xl px-4 py-3">
                    <span className="inline-flex gap-1 items-end h-4">
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-zinc-100 px-6 py-4 bg-white">
            <div className="max-w-2xl mx-auto">
              <ChatInput
                input={input}
                setInput={setInput}
                onSubmit={handleSubmit}
                onSend={sendMessage}
                loading={loading}
                placeholder="Reply..."
                rows={1}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type ChatInputProps = {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSend: (text: string) => void;
  loading: boolean;
  placeholder: string;
  rows: number;
};

function ChatInput({
  input,
  setInput,
  onSubmit,
  onSend,
  loading,
  placeholder,
  rows,
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(input);
            }
          }}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-5 py-4 pr-14 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-zinc-900 text-white disabled:bg-zinc-200 disabled:text-zinc-400 hover:bg-zinc-700 transition-colors flex items-center justify-center"
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 13L8 3M8 3L3 8M8 3L13 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
