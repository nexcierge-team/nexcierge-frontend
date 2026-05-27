"use client";

import { ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BuyerProfile,
  NewOrUsedPreference,
  PurchaseTimeline,
} from "@/types/chat";

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
}

const TIMELINE_LABELS: Record<PurchaseTimeline, string> = {
  urgent_less_than_30_days: "Urgent — under 30 days",
  "1_to_3_months": "1–3 months",
  "3_to_6_months": "3–6 months",
  just_researching: "Just researching",
};

const NEW_OR_USED_LABELS: Record<NewOrUsedPreference, string> = {
  new: "New",
  used: "Used",
  refurbished: "Refurbished",
  no_preference: "No preference",
};

export function ProfileSummaryCard({
  profile,
  reviewRequested,
  reviewSubmitting = false,
  onRequestReview,
}: ProfileSummaryCardProps) {
  const { buyer_info, purchase_request, service_preferences } = profile;
  const techSpecs = Object.entries(purchase_request.technical_specifications);
  const compliance = purchase_request.compliance_requirements;

  return (
    <div className="flex w-full flex-col gap-1.5">
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-gray-100 bg-[#F7F8FA] px-5 py-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
          Sourcing brief
        </div>
        <div className="mt-0.5 text-sm font-semibold text-gray-900">
          Ready for our account manager
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
        <Section title="Buyer">
          <Field label="Name" value={buyer_info.full_name} />
          <Field label="Company" value={buyer_info.company_name} />
          <Field label="Email" value={buyer_info.business_email} />
          <Field label="Phone" value={buyer_info.phone_number} />
          <Field label="Role" value={buyer_info.job_role} />
        </Section>

        <Section title="Machine">
          <Field label="Type" value={purchase_request.machine_type} />
          <Field label="Application" value={purchase_request.intended_application} />
          <Field label="Quantity" value={purchase_request.quantity} />
          <Field
            label="New / used"
            value={
              purchase_request.new_or_used_preference
                ? NEW_OR_USED_LABELS[purchase_request.new_or_used_preference]
                : ""
            }
          />
        </Section>

        <Section title="Delivery">
          <Field label="Country" value={purchase_request.delivery_country} />
          <Field
            label="City / port"
            value={purchase_request.delivery_city_or_port}
          />
          <Field
            label="Timeline"
            value={
              purchase_request.purchase_timeline
                ? TIMELINE_LABELS[purchase_request.purchase_timeline]
                : ""
            }
          />
          <Field label="Budget" value={purchase_request.budget_range} />
        </Section>

        <Section title="Specs & compliance">
          {techSpecs.length > 0 ? (
            techSpecs.map(([k, v]) => <Field key={k} label={k} value={v} />)
          ) : (
            <EmptyHint>No technical specs captured yet</EmptyHint>
          )}
          {compliance.length > 0 && (
            <Field label="Compliance" value={compliance.join(", ")} />
          )}
        </Section>

        {service_preferences.additional_notes && (
          <div className="sm:col-span-2">
            <Section title="Additional notes">
              <p className="text-xs leading-relaxed text-gray-700">
                {service_preferences.additional_notes}
              </p>
            </Section>
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-3 border-t border-gray-100 bg-[#F7F8FA] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-gray-500">
          Our account manager will get back to you within 24 hours.
        </p>
        {reviewRequested ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
            aria-live="polite"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            Transferred
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
                Sending…
              </>
            ) : (
              <>
                Request human review
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </>
            )}
          </Button>
        )}
      </div>
    </div>

      <p className="px-1 text-[11px] text-gray-400">
        Need to change something? Just tell the agent.
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


function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <dt className="shrink-0 text-gray-400">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-gray-800">
        {value}
      </dd>
    </div>
  );
}


function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-gray-400">{children}</p>;
}
