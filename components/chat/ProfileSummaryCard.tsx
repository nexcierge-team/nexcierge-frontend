"use client";

import { ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cardStrings, RTL_LANGUAGES } from "@/lib/cardStrings";
import type { BuyerProfile } from "@/types/chat";

interface ProfileSummaryCardProps {
  profile: BuyerProfile;
  // Sticky session flag controlled by the parent. Once true, the CTA is
  // replaced by a "Transferring…" badge that stays put for the rest of
  // the session.
  reviewRequested: boolean;
  // In-flight flag while the request_review POST is pending. Shows a
  // spinner on the button.
  reviewSubmitting?: boolean;
  onRequestReview?: () => void;
  // Buyer's resolved output language (ISO 639-1). Selects the localized
  // card chrome. Defaults to English. Note: only chrome is localized —
  // the technical-spec keys come from data and stay English by design.
  language?: string;
}

export function ProfileSummaryCard({
  profile,
  reviewRequested,
  reviewSubmitting = false,
  onRequestReview,
  language = "en",
}: ProfileSummaryCardProps) {
  const { buyer_info, purchase_request, service_preferences } = profile;
  const techSpecs = Object.entries(purchase_request.technical_specifications);
  const compliance = purchase_request.compliance_requirements;
  const t = cardStrings(language);
  const dir = RTL_LANGUAGES.has(language) ? "rtl" : "ltr";

  return (
    <div className="flex w-full flex-col gap-1.5" dir={dir}>
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-gray-100 bg-[#F7F8FA] px-5 py-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
          {t.eyebrow}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-gray-900">
          {t.title}
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
        <Section title={t.sectionBuyer}>
          <Field label={t.labelName} value={buyer_info.full_name} />
          <Field label={t.labelCompany} value={buyer_info.company_name} />
          <Field label={t.labelEmail} value={buyer_info.business_email} />
          <Field label={t.labelPhone} value={buyer_info.phone_number} />
          <Field label={t.labelRole} value={buyer_info.job_role} />
        </Section>

        <Section title={t.sectionMachine}>
          <Field label={t.labelType} value={purchase_request.machine_type} />
          <Field label={t.labelApplication} value={purchase_request.intended_application} />
          <Field label={t.labelQuantity} value={purchase_request.quantity} />
          <Field
            label={t.labelNewUsed}
            value={
              purchase_request.new_or_used_preference
                ? t.condition[purchase_request.new_or_used_preference]
                : ""
            }
          />
        </Section>

        <Section title={t.sectionDelivery}>
          <Field label={t.labelCountry} value={purchase_request.delivery_country} />
          <Field
            label={t.labelCityPort}
            value={purchase_request.delivery_city_or_port}
          />
          <Field
            label={t.labelTimeline}
            value={
              purchase_request.purchase_timeline
                ? t.timeline[purchase_request.purchase_timeline]
                : ""
            }
          />
          <Field label={t.labelBudget} value={purchase_request.budget_range} />
        </Section>

        <Section title={t.sectionSpecs}>
          {techSpecs.length > 0 ? (
            techSpecs.map(([k, v]) => (
              <Field key={k} label={humanizeKey(k)} value={v} />
            ))
          ) : (
            <EmptyHint>{t.emptySpecs}</EmptyHint>
          )}
          {compliance.length > 0 && (
            <Field label={t.labelCompliance} value={compliance.join(", ")} />
          )}
        </Section>

        {service_preferences.additional_notes && (
          <div className="sm:col-span-2">
            <Section title={t.sectionNotes}>
              <p className="text-xs leading-relaxed text-gray-700">
                {service_preferences.additional_notes}
              </p>
            </Section>
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-3 border-t border-gray-100 bg-[#F7F8FA] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-gray-500">
          {t.footerNote}
        </p>
        {reviewRequested ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
            aria-live="polite"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            {t.transferred}
          </span>
        ) : (
          <Button
            size="sm"
            variant="accent"
            disabled={reviewSubmitting}
            onClick={onRequestReview}
            className="w-full justify-center sm:w-auto"
          >
            {reviewSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                {t.sending}
              </>
            ) : (
              <>
                {t.cta}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </>
            )}
          </Button>
        )}
      </div>
    </div>

      <p className="px-1 text-[11px] text-gray-400">
        {t.editHint}
      </p>
    </div>
  );
}


function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </div>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}


// The label floats left so the value starts on the SAME line as it and wraps
// to the full width BELOW the label when long (rather than into a narrow column
// beside it). `overflow-hidden` on the row contains the float so it can't bleed
// into the next row. Used for every field in the brief — short labels keep the
// value on one line; long ones (e.g. "Film Width & Layer Configuration") let it
// wrap underneath. (The float follows the card's `dir`, so it sits on the start
// edge in both LTR and RTL.)
function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="overflow-hidden text-xs">
      <dt className="float-left mr-2 text-gray-400 rtl:float-right rtl:ml-2 rtl:mr-0">{label}</dt>
      <dd className="break-words font-medium text-gray-800">{value}</dd>
    </div>
  );
}


// Technical-spec keys come from two sources: curated CSV data points (already
// nicely phrased, e.g. "Film Width & Layer Configuration") and the agent's own
// snake_case keys (e.g. "target_output"). Normalise the latter to Title Case
// for display; leave already-spaced labels untouched.
function humanizeKey(key: string): string {
  if (/[_-]/.test(key)) {
    return key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
  return key;
}


function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-gray-400">{children}</p>;
}
