// Shared, runtime-agnostic helpers for per-request payment links
// (payment_requests, migration 0027). Pure: safe to import from client
// components and Route Handlers alike.

import type {
  PaymentRequestsRow,
  PaymentStatus,
} from "@/lib/supabase/types";

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "paid",
  "cancelled",
];

// Offered in the AM's currency picker. The DB accepts any ISO 4217 code;
// this list is the UX shortlist for the markets we sell into.
export const PAYMENT_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "INR",
  "AED",
  "AUD",
  "CAD",
] as const;

export const MAX_PAYMENT_LABEL = 120;
// numeric(14, 2) caps at just under 10^12.
const MAX_AMOUNT = 999_999_999_999;

// Postgres numeric may arrive as a string over PostgREST.
export function paymentAmount(row: Pick<PaymentRequestsRow, "amount">): number {
  const n = typeof row.amount === "number" ? row.amount : Number(row.amount);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Outstanding total per currency (pending rows only). Mixed currencies
// can't be summed, so the caller gets one entry per currency.
export function outstandingByCurrency(
  rows: PaymentRequestsRow[],
): { currency: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "pending") continue;
    totals.set(r.currency, (totals.get(r.currency) ?? 0) + paymentAmount(r));
  }
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

// Only https links ever render as a clickable "Pay now". Same rule as the
// DB CHECK; the buyer UI re-checks before rendering a link.
export function isSafePaymentUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

export interface PaymentInput {
  label: string;
  amount: number;
  currency: string;
  payment_url: string;
}

// Server-side validation of the AM create body. Returns the cleaned
// input, or an error string for a 400.
export function validatePaymentInput(
  raw: unknown,
): { ok: true; value: PaymentInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid body" };
  const b = raw as Record<string, unknown>;
  const label = typeof b.label === "string" ? b.label.trim() : "";
  if (!label || label.length > MAX_PAYMENT_LABEL) {
    return { ok: false, error: `label must be 1 to ${MAX_PAYMENT_LABEL} characters` };
  }
  const amount = typeof b.amount === "number" ? b.amount : Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return { ok: false, error: "amount must be a positive number" };
  }
  const currency = typeof b.currency === "string" ? b.currency.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "currency must be a 3-letter ISO code" };
  }
  const url = typeof b.payment_url === "string" ? b.payment_url.trim() : "";
  if (!isSafePaymentUrl(url) || url.length > 2048) {
    return { ok: false, error: "payment_url must be an https link" };
  }
  return {
    ok: true,
    value: {
      label,
      amount: Math.round(amount * 100) / 100,
      currency,
      payment_url: url,
    },
  };
}

export function sortPayments(rows: PaymentRequestsRow[]): PaymentRequestsRow[] {
  return [...rows].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
}
