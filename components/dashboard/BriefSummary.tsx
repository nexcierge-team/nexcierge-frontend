"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardStrings } from "@/lib/cardStrings";
import { amBriefStrings, type AmBriefStrings } from "@/lib/amBriefStrings";
import type { LeadQuality, RfqsRow, RfqStatus } from "@/lib/supabase/types";
import type {
  NewOrUsedPreference,
  PurchaseTimeline,
} from "@/types/chat";
import { RatingSection } from "./RatingSection";

export function BriefSummary({
  rfq,
  sessionId,
  language,
  canRate,
  onSaveRating,
  onGenerateLessons,
}: {
  rfq: RfqsRow;
  sessionId: string;
  language: string;
  canRate: boolean;
  onSaveRating: (input: {
    quality: LeadQuality;
    issues: string[];
    notes: string;
  }) => Promise<boolean>;
  onGenerateLessons: () => Promise<number | null>;
}) {
  // Section titles + field labels + the timeline/condition enum tables are
  // shared with the buyer-facing ProfileSummaryCard (lib/cardStrings.ts).
  // The brief itself is ALWAYS rendered in English — titles, labels, and
  // enum values stay canonical regardless of the AM's display language, so
  // the brief matches HubSpot/CRM records and the buyer's submitted data.
  // Only AM-only chrome (CRM section, status pill, rating card) from
  // lib/amBriefStrings.ts localizes to the AM's chosen `language`. The
  // brief's free-text values are shown exactly as the buyer submitted them
  // — we no longer translate the brief itself (a future "download in
  // language X" export can translate on demand).
  const t = cardStrings("en");
  const chrome = amBriefStrings(language);
  // English chrome for strings that live inside the brief reading surface
  // (panel header, empty-specs placeholder) — they follow the brief, not
  // the AM language.
  const chromeEn = amBriefStrings("");
  const machineType = rfq.machine_type;
  const application = rfq.intended_application;
  const notes = rfq.additional_notes;
  const specs = Object.entries(rfq.technical_specifications ?? {});

  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-gray-200 bg-[#F7F8FA] px-5 py-6 lg:block">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {chromeEn.briefDetailsTitle}
      </div>

      <Section title={t.sectionBuyer}>
        <Field label={t.labelName} value={rfq.full_name} />
        <Field label={t.labelCompany} value={rfq.company_name} />
        <Field label={t.labelEmail} value={rfq.business_email} />
        <Field label={t.labelPhone} value={rfq.phone_number} />
        <Field label={t.labelRole} value={rfq.job_role} />
      </Section>

      <Section title={t.sectionMachine}>
        <Field label={t.labelType} value={machineType} />
        <Field label={t.labelApplication} value={application} />
        <Field label={t.labelQuantity} value={rfq.quantity} />
        <Field
          label={t.labelNewUsed}
          value={
            isNewOrUsedPreference(rfq.new_or_used_preference)
              ? t.condition[rfq.new_or_used_preference]
              : rfq.new_or_used_preference
          }
        />
      </Section>

      <Section title={t.sectionDelivery}>
        <Field label={t.labelCountry} value={rfq.delivery_country} />
        <Field label={t.labelCityPort} value={rfq.delivery_city_or_port} />
        <Field
          label={t.labelTimeline}
          value={
            isPurchaseTimeline(rfq.purchase_timeline)
              ? t.timeline[rfq.purchase_timeline]
              : rfq.purchase_timeline
          }
        />
        <Field label={t.labelBudget} value={rfq.budget_range} />
      </Section>

      <Section title={t.sectionSpecs}>
        {specs.length === 0 ? (
          <p className="text-[11px] italic text-gray-400">
            {chromeEn.noSpecsCaptured}
          </p>
        ) : (
          specs.map(([k, v]) => (
            <Field key={k} label={humanizeKey(k)} value={String(v)} />
          ))
        )}
        {rfq.compliance_requirements.length > 0 && (
          <Field
            label={t.labelCompliance}
            value={rfq.compliance_requirements.join(", ")}
          />
        )}
      </Section>

      {notes && (
        <Section title={t.sectionNotes}>
          <p className="text-xs leading-relaxed text-gray-700">{notes}</p>
        </Section>
      )}

      <Section title={chrome.sectionCrm}>
        <StatusPill status={rfq.status} chrome={chrome} />
        {rfq.hubspot_deal_id ? (
          <p className="mt-2 text-[11px] text-gray-500">
            {chrome.hubspotDealPrefix} {rfq.hubspot_deal_id}
          </p>
        ) : (
          <p className="mt-2 text-[11px] italic text-gray-400">
            {chrome.notPushedToHubspot}
          </p>
        )}
        <CopyableId label={chrome.sessionIdLabel} value={sessionId} />
      </Section>

      <Section title={chrome.sectionRating}>
        {canRate ? (
          <RatingSection
            key={rfq.id}
            rfq={rfq}
            chrome={chrome}
            onSave={onSaveRating}
            onGenerate={onGenerateLessons}
          />
        ) : (
          <p className="text-[11px] italic text-gray-400">
            {chrome.claimToRate}
          </p>
        )}
      </Section>
    </aside>
  );
}

// Click-to-copy id row (CRM section). AMs need the session UUID for SQL
// forensics — clearing a cached translation, querying chat_messages —
// without digging it out of devtools network calls.
function CopyableId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={value}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="mt-2 flex w-full items-center gap-1.5 text-left text-[11px] text-gray-500 transition-colors hover:text-gray-700"
    >
      <span className="shrink-0">{label}</span>
      <span className="truncate font-mono text-[10px] text-gray-400">
        {value}
      </span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-600" strokeWidth={2} />
      ) : (
        <Copy className="h-3 w-3 shrink-0" strokeWidth={1.75} />
      )}
    </button>
  );
}

function isPurchaseTimeline(v: string): v is PurchaseTimeline {
  return v === "urgent_less_than_30_days" || v === "1_to_3_months" || v === "3_to_6_months" || v === "just_researching";
}

function isNewOrUsedPreference(v: string): v is NewOrUsedPreference {
  return v === "new" || v === "used" || v === "refurbished" || v === "no_preference";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// The label floats left so the value starts on the SAME line as it and wraps to
// the full width BELOW the label when long (rather than being clipped by
// `truncate` in this narrow w-80 sidebar). `overflow-hidden` on the row contains
// the float so it can't bleed into the next row. Used for every field in the
// brief — short labels keep the value on one line; long ones wrap underneath.
function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="overflow-hidden text-xs">
      <span className="float-left mr-2 text-gray-400">{label}</span>
      <span className="break-words font-medium text-gray-800">{value}</span>
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

function StatusPill({
  status,
  chrome,
}: {
  status: RfqStatus;
  chrome: AmBriefStrings;
}) {
  const map: Record<RfqStatus, { label: string; className: string }> = {
    in_progress: {
      label: chrome.statusInProgress,
      className: "bg-blue-100 text-blue-800",
    },
    submitted: {
      label: chrome.statusSubmitted,
      className: "bg-emerald-100 text-emerald-800",
    },
    won: { label: chrome.statusWon, className: "bg-emerald-100 text-emerald-800" },
    lost: { label: chrome.statusLost, className: "bg-gray-200 text-gray-700" },
  };
  const v = map[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        v.className,
      )}
    >
      {v.label}
    </span>
  );
}
