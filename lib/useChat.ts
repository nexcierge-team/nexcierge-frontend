"use client";

import { useState } from "react";
import type { Message } from "@/types/chat";
import { MOCK_SUPPLIER_MATCH } from "./mockData";

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
  return t.includes("pet") || t.includes("bottle") || t.includes("blowing");
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
      const attach = shouldAttachSupplier(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: "agent",
          content: reply,
          supplierCards: attach ? [MOCK_SUPPLIER_MATCH] : undefined,
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
