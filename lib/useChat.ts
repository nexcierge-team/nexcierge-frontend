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
  // Sticky session-level flag. Once the backend reports pre_qual_complete=true,
  // we keep it true for the rest of the session — gating logic for buttons
  // shouldn't toggle off if a later response doesn't include the flag.
  const [preQualComplete, setPreQualComplete] = useState(false);
  // Tracks the last user-typed message so `retry()` can re-send it after
  // a failed API call without forcing the user to re-type.
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  // Common API call + response handling. Used by both sendMessage (adds
  // the user bubble first) and retry (skips the user bubble — the original
  // is still on screen).
  async function callApi(text: string): Promise<void> {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const reply =
        data.reply ?? "Sorry — something went wrong. Please try again.";
      const supplierCards = (data.supplier_matches ?? []) as SupplierMatch[];
      if (data.pre_qual_complete) {
        setPreQualComplete(true);
      }
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
          content:
            "Connection error. Please try again, or check that the backend is running.",
          error: true,
        },
      ]);
    }
  }

  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLastUserMessage(trimmed);
    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), role: "user", content: trimmed },
    ]);
    setLoading(true);
    try {
      await callApi(trimmed);
    } finally {
      setLoading(false);
    }
  }

  // Re-send the last user message after an error. Removes the trailing
  // error bubble first so the conversation reads cleanly on success.
  async function retry(): Promise<void> {
    if (!lastUserMessage || loading) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "agent" && last.error) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    setLoading(true);
    try {
      await callApi(lastUserMessage);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSessionId(newSessionId());
    setMessages([]);
    setPreQualComplete(false);
    setLastUserMessage(null);
  }

  return {
    sessionId,
    messages,
    loading,
    sendMessage,
    retry,
    reset,
    preQualComplete,
  };
}
