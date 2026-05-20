"use client";

import { useState } from "react";
import { Box, MapPin, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupplierMatch } from "@/types/chat";
import { SupplierDetailModal } from "./SupplierDetailModal";

interface SupplierCardProps {
  match: SupplierMatch;
  // When false, Customize + Request-human-review buttons are hidden.
  // Drives the gating UX: buyers can't trigger handoff actions until the
  // agent has confirmed pre-qualification is complete.
  preQualComplete?: boolean;
  onCustomize?: (match: SupplierMatch) => void;
  onRequestReview?: (match: SupplierMatch) => void;
}

const SPECS_TO_SHOW = 4;

export function SupplierCard({
  match,
  preQualComplete = false,
  onCustomize,
  onRequestReview,
}: SupplierCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const specEntries = Object.entries(match.specs ?? {}).slice(0, SPECS_TO_SHOW);
  const supplier = match.supplier ?? {};
  const price = formatPrice(match);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex">
          {/* Clickable thumbnail — opens detail modal */}
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            aria-label={`View details for ${match.name}`}
            className="group relative flex h-32 w-32 shrink-0 items-center justify-center border-r border-gray-200 bg-gray-50 transition-colors hover:bg-gray-100"
          >
            {match.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.image_url}
                alt={match.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Box className="h-8 w-8 text-gray-300" strokeWidth={1.25} />
            )}
          </button>

          <div className="flex flex-1 flex-col p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Title — clickable, wraps to 2 lines max */}
                <button
                  type="button"
                  onClick={() => setDetailOpen(true)}
                  className="block text-left text-sm font-semibold leading-snug text-gray-900 transition-colors hover:text-[#0F2747]"
                >
                  <span className="line-clamp-2">{match.name}</span>
                </button>
                <SupplierLine supplier={supplier} />
              </div>
              <div className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-900">
                {price}
              </div>
            </div>

            {specEntries.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {specEntries.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline gap-1.5 min-w-0"
                  >
                    <dt className="shrink-0 text-gray-400">{label}</dt>
                    <dd className="truncate font-medium text-gray-700">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-[#F7F8FA] px-4 py-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDetailOpen(true)}
          >
            View specs
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCustomize?.(match)}
          >
            Customize
          </Button>
          {/* The Request human review button only appears after the agent
              calls signal_pre_qual_complete — until then the buyer can't
              trigger handoff. View specs + Customize stay available
              throughout (info-only / chat prompt). */}
          {preQualComplete && (
            <Button
              size="sm"
              variant="accent"
              className="ml-auto"
              onClick={() => onRequestReview?.(match)}
            >
              Request human review
            </Button>
          )}
        </div>
      </div>

      <SupplierDetailModal
        match={detailOpen ? match : null}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}


function SupplierLine({
  supplier,
}: {
  supplier: SupplierMatch["supplier"];
}) {
  const bits: React.ReactNode[] = [];
  if (supplier.name) {
    bits.push(
      <span key="name" className="font-medium text-gray-700">
        {supplier.name}
      </span>,
    );
  }
  if (supplier.location) {
    bits.push(
      <span
        key="loc"
        className="inline-flex items-center gap-0.5 text-gray-500"
      >
        <MapPin className="h-3 w-3" strokeWidth={1.5} />
        {supplier.location}
      </span>,
    );
  }
  if (supplier.rating != null) {
    bits.push(
      <span
        key="rating"
        className="inline-flex items-center gap-0.5 text-gray-500"
      >
        <Star className="h-3 w-3 fill-current" strokeWidth={1.5} />
        {supplier.rating.toFixed(1)}
        {supplier.review_count != null && ` (${supplier.review_count})`}
      </span>,
    );
  }
  if (supplier.is_verified || supplier.is_trustseal) {
    bits.push(
      <span
        key="verified"
        className="inline-flex items-center gap-0.5 text-[#0F2747]"
        title="Verified supplier"
      >
        <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
        Verified
      </span>,
    );
  }
  if (bits.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
      {bits.map((b, i) => (
        <span key={i} className="inline-flex items-center">
          {b}
          {i < bits.length - 1 && <span className="ml-2 text-gray-300">·</span>}
        </span>
      ))}
    </div>
  );
}


function formatPrice(match: SupplierMatch): string {
  if (match.price_hidden) return "Get quote";
  if (match.price_usd == null) return "Quote on request";
  const amt = match.price_usd;
  if (amt >= 100000) return `$${(amt / 1000).toFixed(0)}k`;
  if (amt >= 10000) return `$${(amt / 1000).toFixed(1)}k`;
  return `$${amt.toFixed(0)}`;
}
