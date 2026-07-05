"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardStrings } from "@/lib/cardStrings";
import { AM_BRIEF_EN, type AmBriefStrings } from "@/lib/amBriefStrings";
import type { LeadQuality, RfqsRow, RfqStatus } from "@/lib/supabase/types";
import type {
  NewOrUsedPreference,
  PurchaseTimeline,
} from "@/types/chat";
import { QUALITY_CHIP, RatingSection } from "./RatingSection";

// Right-hand brief panel. Pinned to English in its entirety — headings,
// field labels, enum values, AND the workflow chrome (status pill, CRM
// copy, rating card) — so it stays canonical against HubSpot/CRM records.
// The AM display language selector translates only the chat thread — see
// docs/ARCHITECTURE.md § AM display language.
export function BriefSummary({
  rfq,
  sessionId,
  canRate,
  onSaveRating,
  onGenerateLessons,
}: {
  rfq: RfqsRow;
  sessionId: string;
  canRate: boolean;
  onSaveRating: (input: {
    quality: LeadQuality;
    issues: string[];
    notes: string;
  }) => Promise<boolean>;
  onGenerateLessons: () => Promise<number | null>;
}) {
  // Field labels + timeline/condition enum tables are shared with the
  // buyer-facing ProfileSummaryCard (lib/cardStrings.ts), always English.
  const t = cardStrings("en");
  const chrome = AM_BRIEF_EN;
  const specs = Object.entries(rfq.technical_specifications ?? {});
  const created = rfq.created_at
    ? new Date(rfq.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const qualityLabel: Record<LeadQuality, string> = {
    qualified: chrome.qualityQualified,
    partial: chrome.qualityPartial,
    junk: chrome.qualityJunk,
  };

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-gray-200 bg-white lg:flex">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 pb-4 pt-5">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-900">
          {rfq.machine_type || "Sourcing brief"}
        </h2>
        <StatusPill status={rfq.status} chrome={chrome} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <PanelSection title="Buyer information" first>
          <Row label={t.labelName} value={rfq.full_name} />
          <Row label={t.labelCompany} value={rfq.company_name} />
          <Row label={t.labelEmail} value={rfq.business_email} />
          <Row label={t.labelPhone} value={rfq.phone_number} />
          <Row label={t.labelRole} value={rfq.job_role} />
          <Row label={t.labelCountry} value={rfq.delivery_country} />
        </PanelSection>

        <PanelSection title="RFQ details">
          <Row label={t.labelType} value={rfq.machine_type} />
          <Row label={t.labelApplication} value={rfq.intended_application} />
          <Row label={t.labelQuantity} value={rfq.quantity} />
          <Row
            label={t.labelNewUsed}
            value={
              isNewOrUsedPreference(rfq.new_or_used_preference)
                ? t.condition[rfq.new_or_used_preference]
                : rfq.new_or_used_preference
            }
          />
          {specs.map(([k, v]) => (
            <Row key={k} label={humanizeKey(k)} value={String(v)} />
          ))}
          {rfq.compliance_requirements.length > 0 && (
            <Row
              label={t.labelCompliance}
              value={rfq.compliance_requirements.join(", ")}
            />
          )}
          <Row label={t.labelCityPort} value={rfq.delivery_city_or_port} />
          <Row
            label={t.labelTimeline}
            value={
              isPurchaseTimeline(rfq.purchase_timeline)
                ? t.timeline[rfq.purchase_timeline]
                : rfq.purchase_timeline
            }
          />
          <Row label={t.labelBudget} value={rfq.budget_range} />
          <Row label="Created" value={created} />
        </PanelSection>

        {rfq.additional_notes && (
          <PanelSection title={t.sectionNotes}>
            <p className="text-[13px] leading-relaxed text-gray-700">
              {rfq.additional_notes}
            </p>
          </PanelSection>
        )}

        <PanelSection
          title={chrome.sectionRating}
          badge={
            rfq.lead_quality ? (
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                  QUALITY_CHIP[rfq.lead_quality],
                )}
              >
                {qualityLabel[rfq.lead_quality]}
              </span>
            ) : null
          }
        >
          {canRate ? (
            <RatingSection
              key={rfq.id}
              rfq={rfq}
              chrome={chrome}
              onSave={onSaveRating}
              onGenerate={onGenerateLessons}
            />
          ) : (
            <p className="text-xs italic text-gray-400">
              {chrome.claimToRate}
            </p>
          )}
        </PanelSection>

        <PanelSection title={chrome.sectionCrm}>
          {rfq.hubspot_deal_id ? (
            <p className="text-xs text-gray-500">
              {chrome.hubspotDealPrefix} {rfq.hubspot_deal_id}
            </p>
          ) : (
            <p className="text-xs italic text-gray-400">
              {chrome.notPushedToHubspot}
            </p>
          )}
          <CopyableId label={chrome.sessionIdLabel} value={sessionId} />
        </PanelSection>
      </div>
    </aside>
  );
}

// One section of the panel: sentence-case semibold heading (optionally
// with an inline badge, e.g. the lead-quality pill), hairline divider
// between sections.
function PanelSection({
  title,
  badge,
  first = false,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("py-5", !first && "border-t border-gray-100")}>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {badge}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// Two-column label/value row: fixed label rail on the left, value
// wrapping in the right column — matches the calmer reference layout
// (the old float-left variant packed everything onto one line).
function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[100px_1fr] gap-x-3 text-[13px] leading-relaxed">
      <span className="text-gray-400">{label}</span>
      <span className="break-words text-gray-800">{value}</span>
    </div>
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
      className="flex w-full items-center gap-1.5 text-left text-xs text-gray-500 transition-colors hover:text-gray-700"
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
