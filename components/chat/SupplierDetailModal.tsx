"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box, MapPin, ShieldCheck, Star, X } from "lucide-react";
import type { SupplierMatch } from "@/types/chat";

interface SupplierDetailModalProps {
  match: SupplierMatch | null;
  onClose: () => void;
}

export function SupplierDetailModal({
  match,
  onClose,
}: SupplierDetailModalProps) {
  // Esc to close + lock body scroll while open
  useEffect(() => {
    if (!match) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [match, onClose]);

  const supplier = match?.supplier ?? {};
  const images = match?.all_image_urls ?? [];

  return (
    <AnimatePresence>
      {match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 p-4 backdrop-blur-md sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold leading-snug text-gray-900">
                  {match.name}
                </h2>
                <SupplierLine supplier={supplier} />
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Image gallery */}
              {images.length > 0 ? (
                <div className="border-b border-gray-100 bg-[#F7F8FA] p-5">
                  <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
                    {images.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`${match.name} ${i + 1}`}
                        loading="lazy"
                        className="h-48 w-auto shrink-0 rounded-xl border border-gray-200 bg-white object-cover"
                      />
                    ))}
                  </div>
                  {images.length > 1 && (
                    <div className="mt-2 text-center text-[11px] text-gray-400">
                      {images.length} images · scroll to see all
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-b border-gray-100 bg-[#F7F8FA] py-12 text-center">
                  <Box
                    className="mx-auto h-10 w-10 text-gray-300"
                    strokeWidth={1.25}
                  />
                  <p className="mt-2 text-xs text-gray-500">No images</p>
                </div>
              )}

              {/* Price + category */}
              <div className="px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatPriceFull(match)}
                  </div>
                  {match.category && (
                    <div className="text-sm text-gray-500">{match.category}</div>
                  )}
                </div>

                {/* All specs */}
                {match.specs && Object.keys(match.specs).length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                      Specifications
                    </h3>
                    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                      {Object.entries(match.specs).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-2 text-sm"
                        >
                          <dt className="shrink-0 text-gray-500">{k}</dt>
                          <dd className="text-right font-medium text-gray-900">
                            {v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Description */}
                {match.description && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                      Description
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {match.description}
                    </p>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
      {bits.map((b, i) => (
        <span key={i} className="inline-flex items-center">
          {b}
          {i < bits.length - 1 && (
            <span className="ml-2 text-gray-300">·</span>
          )}
        </span>
      ))}
    </div>
  );
}


function formatPriceFull(match: SupplierMatch): string {
  if (match.price_hidden) return "Get quote";
  if (match.price_usd == null) return "Quote on request";
  const amt = match.price_usd;
  return `$${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${
    match.price_currency ?? "USD"
  }`;
}
