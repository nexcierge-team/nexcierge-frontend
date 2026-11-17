"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { sortPayments } from "@/lib/payments";
import type { PaymentRequestsRow } from "@/lib/supabase/types";

// Payment links for ONE sourcing request (chat_session), read straight
// from Supabase with the viewer's own session (RLS migration 0027: the
// buyer who owns the session, or any AM) plus a live channel so a link
// the AM sends, or marks paid, lands in an open tab immediately. Used by
// the buyer's Payments tab and the AM's brief sidebar.
//
// `enabled` lets the buyer page skip the read for draft requests (status
// 'ai'): payment rows only exist after an AM has claimed the brief, so a
// draft never has any. Flipping to true (handoff while the tab is open)
// runs the fetch then.

interface State {
  // The session `rows` were read for; null until the first read lands.
  sessionId: string | null;
  rows: PaymentRequestsRow[];
}

export function useSessionPayments(
  sessionId: string | null,
  enabled = true,
) {
  const [state, setState] = useState<State>({ sessionId: null, rows: [] });

  const active = enabled && sessionId ? sessionId : null;

  useEffect(() => {
    if (!active) return;
    const supabase = getSupabaseBrowser();
    let cancelled = false;
    // No synchronous setState here: "loading" is derived at read time
    // (state.sessionId !== active) until the first read lands.

    supabase
      .from("payment_requests")
      .select("*")
      .eq("chat_session_id", active)
      .order("created_at", { ascending: false })
      .then(
        ({ data, error }: { data: PaymentRequestsRow[] | null; error: unknown }) => {
          if (cancelled) return;
          if (error) console.error("payment_requests fetch failed:", error);
          setState({ sessionId: active, rows: sortPayments(data ?? []) });
        },
      );

    const channel = supabase
      .channel(`payments:${active}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_requests",
          filter: `chat_session_id=eq.${active}`,
        },
        (payload: {
          eventType: "INSERT" | "UPDATE" | "DELETE";
          new: PaymentRequestsRow;
          old: { id?: string };
        }) => {
          setState((prev) => {
            // Before the first read lands, ignore: the read covers it.
            if (prev.sessionId !== active) return prev;
            if (payload.eventType === "DELETE") {
              return {
                ...prev,
                rows: prev.rows.filter((r) => r.id !== payload.old?.id),
              };
            }
            return { ...prev, rows: mergeRows(prev.rows, [payload.new]) };
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [active]);

  // Local merge of a row the caller already has (the AM's own create /
  // status change), so the UI doesn't wait for the realtime echo.
  const upsertLocal = useCallback(
    (row: PaymentRequestsRow) => {
      setState((prev) =>
        prev.sessionId === row.chat_session_id
          ? { ...prev, rows: mergeRows(prev.rows, [row]) }
          : prev,
      );
    },
    [],
  );

  // Read-time guard: rows from a previously-open request never show
  // against the new one, even for the frame before the effect runs.
  const current = state.sessionId === active && active !== null;
  return {
    payments: current ? state.rows : [],
    loading: active !== null && !current,
    upsertLocal,
  };
}

function mergeRows(
  base: PaymentRequestsRow[],
  incoming: PaymentRequestsRow[],
): PaymentRequestsRow[] {
  const byId = new Map(base.map((r) => [r.id, r]));
  for (const r of incoming) byId.set(r.id, r);
  return sortPayments([...byId.values()]);
}
