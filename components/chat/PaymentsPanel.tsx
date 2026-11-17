"use client";

import posthog from "posthog-js";
import { ArrowUpRight, CreditCard, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROGRESS_EN } from "@/lib/progressStrings";
import {
  formatMoney,
  isSafePaymentUrl,
  outstandingByCurrency,
  paymentAmount,
} from "@/lib/payments";
import type { PaymentRequestsRow, PaymentStatus } from "@/lib/supabase/types";
import { EmptyState, PanelHeading } from "./DocumentsPanel";

// Payments tab of a request: the payment links the account manager has
// issued for THIS request (payment_requests, migration 0027), newest
// first, with an outstanding total and a "Pay now" link on pending rows.
// Rows come from useSessionPayments in app/chat/page.tsx (live via
// Realtime), so a new link or a "paid" mark appears without a refresh.

const STATUS_CLASS: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-700/30",
  paid: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-700/30",
  cancelled: "bg-ink/10 text-ink-soft ring-1 ring-inset ring-ink/20",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function PaymentsPanel({
  sessionId,
  payments,
  loading,
  isDraft,
}: {
  sessionId: string | null;
  payments: PaymentRequestsRow[];
  loading: boolean;
  isDraft: boolean;
}) {
  const ps = PROGRESS_EN;
  const outstanding = outstandingByCurrency(payments);

  function trackOpen(p: PaymentRequestsRow) {
    // Buyer funnel step (ids + enums only). Guarded like signup_gate_shown.
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.capture("payment_link_opened", {
        session_id: sessionId,
        payment_id: p.id,
        currency: p.currency,
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PanelHeading title={ps.paymentsTitle} lead={ps.paymentsLead} />

      {loading ? (
        <div className="mt-5 space-y-2">
          <div className="h-14 animate-pulse bg-ink/10" />
          <div className="h-14 animate-pulse bg-ink/10" />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" strokeWidth={1.5} />}
          text={isDraft ? ps.paymentsEmptyDraft : ps.paymentsEmpty}
        />
      ) : (
        <>
          {/* Outstanding summary band. */}
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-[1.5px] border-b-0 border-ink bg-paper px-3.5 py-3">
            <span className="type-data text-xs font-semibold text-ink-soft">
              {outstanding.length > 0 ? ps.paymentsOutstanding : ps.paymentsAllSettled}
            </span>
            {outstanding.length > 0 && (
              <span className="type-title text-lg font-bold text-ink">
                {outstanding.map((o) => formatMoney(o.amount, o.currency)).join(" + ")}
              </span>
            )}
          </div>
          <ol className="border-[1.5px] border-ink bg-sheet">
            {payments.map((p, i) => {
              const payable = p.status === "pending" && isSafePaymentUrl(p.payment_url);
              const when =
                p.status === "paid" && p.paid_at
                  ? `${ps.paymentStatus.paid} ${formatDate(p.paid_at)}`
                  : formatDate(p.created_at);
              return (
                <li
                  key={p.id}
                  className="row-in grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule px-3.5 py-3 last:border-b-0 sm:gap-4"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <span className="type-data inline-block rounded-[2px] border-[1.5px] border-ink bg-paint px-2 py-[3px] text-[12px] font-bold text-ink">
                    {ps.paymentTag}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="truncate text-sm font-semibold text-ink">{p.label}</span>
                      <span
                        className={cn(
                          "type-title text-sm font-bold",
                          p.status === "cancelled" ? "text-gray-500 line-through" : "text-ink",
                        )}
                      >
                        {formatMoney(paymentAmount(p), p.currency)}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "type-data inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          STATUS_CLASS[p.status],
                        )}
                      >
                        {ps.paymentStatus[p.status]}
                      </span>
                      <span className="type-data text-xs text-gray-500">{when}</span>
                    </span>
                  </span>
                  {payable ? (
                    <a
                      href={p.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackOpen(p)}
                      className="type-title inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-paint px-3 py-2 text-xs font-bold text-ink btn-wipe hover:text-paint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint"
                    >
                      {ps.payNow}
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </a>
                  ) : (
                    <span aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-ink" strokeWidth={1.5} />
        {ps.paymentsTrust}
      </p>
    </div>
  );
}
