"use client";

import { useState } from "react";
import type { Message, SupplierMatch } from "@/types/chat";

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function newMessageId() {
  return Math.random().toString(36).slice(2);
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string>(newSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), role: "user", content: trimmed },
    ]);
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
      const supplierCards = (data.supplier_matches ?? []) as SupplierMatch[];
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: "agent",
          content: reply,
          supplierCards: supplierCards.length > 0 ? supplierCards : undefined,
        },
      ]);
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
    setMessages([]);
  }

  return { sessionId, messages, loading, sendMessage, reset };
}
