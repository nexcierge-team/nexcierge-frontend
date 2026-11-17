"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_PAYMENT_LABEL,
  PAYMENT_CURRENCIES,
  formatMoney,
  isSafePaymentUrl,
  paymentAmount,
} from "@/lib/payments";
import type {
  PaymentRequestsRow,
  PaymentStatus,
} from "@/lib/supabase/types";

// AM side of per-request payments (payment_requests, migration 0027):
// the list of links already sent for this brief and, for the assigned AM,
// a small form to send a new one plus Mark paid / Cancel / Reopen. Rows
// come from useSessionPayments in BriefSummary (shared with the section
// badge); this component only calls the routes and merges the response
// locally so the AM doesn't wait for the realtime echo.
// English-pinned like the rest of the brief sidebar.

export const PAYMENT_STATUS_CHIP: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Awaiting payment",
    className: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-700/30",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-700/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-ink/10 text-ink-soft ring-1 ring-inset ring-ink/20",
  },
};

const INPUT =
  "w-full rounded-sm border border-rule-strong bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-gray-500 focus:border-ink focus:outline-none";

export function PaymentsSection({
  sessionId,
  payments,
  loading,
  canManage,
  onSaved,
}: {
  sessionId: string;
  payments: PaymentRequestsRow[];
  loading: boolean;
  canManage: boolean;
  onSaved: (row: PaymentRequestsRow) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const amountNum = Number(amount);
  const valid =
    label.trim().length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    isSafePaymentUrl(url.trim());

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/am/sessions/${encodeURIComponent(sessionId)}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            amount: amountNum,
            currency,
            payment_url: url.trim(),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      onSaved(data.payment as PaymentRequestsRow);
      setLabel("");
      setAmount("");
      setUrl("");
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(row: PaymentRequestsRow, status: PaymentStatus) {
    if (busyId) return;
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/am/sessions/${encodeURIComponent(sessionId)}/payments/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      onSaved(data.payment as PaymentRequestsRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="text-xs italic text-gray-500">
          No payment links sent for this request yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => {
            const chip = PAYMENT_STATUS_CHIP[p.status];
            const busy = busyId === p.id;
            return (
              <li
                key={p.id}
                className="rounded-none border border-rule-strong bg-white px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="ph-no-capture min-w-0 text-xs font-semibold text-ink">
                    {p.label}
                  </span>
                  <span className="type-data shrink-0 text-xs font-bold text-ink">
                    {formatMoney(paymentAmount(p), p.currency)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "type-data inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      chip.className,
                    )}
                  >
                    {chip.label}
                  </span>
                  <a
                    href={p.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blueprint underline-offset-2 hover:underline"
                  >
                    Link
                    <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                  </a>
                  {canManage && (
                    <span className="ml-auto flex items-center gap-1">
                      {busy && (
                        <Loader2 className="h-3 w-3 animate-spin text-ink-soft" strokeWidth={2} />
                      )}
                      {p.status === "pending" ? (
                        <>
                          <SmallAction disabled={busy} onClick={() => setStatus(p, "paid")}>
                            Mark paid
                          </SmallAction>
                          <SmallAction disabled={busy} onClick={() => setStatus(p, "cancelled")}>
                            Cancel
                          </SmallAction>
                        </>
                      ) : (
                        <SmallAction disabled={busy} onClick={() => setStatus(p, "pending")}>
                          Reopen
                        </SmallAction>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage &&
        (formOpen ? (
          <form onSubmit={create} className="space-y-2 border border-rule-strong bg-sheet p-3">
            <input
              className={INPUT}
              placeholder="Label, e.g. 30% deposit"
              value={label}
              maxLength={MAX_PAYMENT_LABEL}
              onChange={(e) => setLabel(e.target.value)}
              aria-label="Payment label"
            />
            <div className="flex gap-2">
              <input
                className={INPUT}
                inputMode="decimal"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                aria-label="Amount"
              />
              <select
                className={cn(INPUT, "w-24 shrink-0")}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Currency"
              >
                {PAYMENT_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <input
              className={INPUT}
              type="url"
              placeholder="https://… payment link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-label="Payment link URL"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setError(null);
                }}
                className="rounded-sm px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-ink/10 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!valid || submitting}
                className="type-title inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-paint px-3 py-1.5 text-xs font-bold text-ink btn-wipe hover:text-paint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />}
                Send to buyer
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-ink px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            New payment link
          </button>
        ))}

      {!canManage && (
        <p className="text-xs italic text-gray-500">
          Claim this brief to send payment links.
        </p>
      )}
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  );
}

function SmallAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-sm px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-50"
    >
      {children}
    </button>
  );
}
