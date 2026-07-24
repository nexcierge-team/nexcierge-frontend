// English-pinned strings for the buyer-facing sourcing dashboard chrome —
// the sidebar (New sourcing request, Recent requests, status subtitles)
// and the sourcing-progress rail (timeline stage labels, next-step copy,
// status pill).
//
// Deliberately NOT localized: only the conversation itself (chat bubbles,
// composer chrome via lib/chatStrings.ts) and the RFQ summary card
// (lib/cardStrings.ts) follow the buyer's language. All workspace chrome
// around them — sidebar, rail, headers — stays English, matching the AM
// side's English-pinned brief sidebar (lib/amBriefStrings.ts).
//
// Stage slugs come from lib/sourcingStages.ts. `stageLabel` is the full
// timeline label; `stageShort` is the compact form used in the sidebar
// subtitle and the header status pill.

import type { SourcingStage } from "@/lib/sourcingStages";

export interface ProgressStrings {
  newRequest: string;
  myRequests: string;
  recentRequests: string;
  noRequests: string;
  loading: string;
  untitledRequest: string;
  sourcingProgress: string;
  nextStepTitle: string;
  progressAria: string;
  closeAria: string;
  statusDraft: string;
  statusClosed: string;
  stageShort: Record<SourcingStage, string>;
  stageLabel: Record<SourcingStage, string>;
  nextStepPre: string;
  nextStep: Record<SourcingStage, string>;
}

export const PROGRESS_EN: ProgressStrings = {
  newRequest: "New sourcing request",
  myRequests: "My requests",
  recentRequests: "Recent requests",
  noRequests: "No requests yet.",
  loading: "Loading…",
  untitledRequest: "New request",
  sourcingProgress: "Sourcing progress",
  nextStepTitle: "Next step",
  progressAria: "View sourcing progress",
  closeAria: "Close panel",
  statusDraft: "Draft",
  statusClosed: "Closed",
  stageShort: {
    brief_submitted: "Submitted",
    in_review: "In review",
    suppliers_contacted: "Contacting suppliers",
    quotes_received: "Quotes received",
    proposal_negotiation: "Negotiation",
    order_production: "In production",
    inspection_logistics: "Shipping",
    delivered: "Delivered",
  },
  stageLabel: {
    brief_submitted: "Brief submitted",
    in_review: "In review by account manager",
    suppliers_contacted: "Suppliers being contacted",
    quotes_received: "Quotes received",
    proposal_negotiation: "Proposal & negotiation",
    order_production: "Order & production",
    inspection_logistics: "Inspection & logistics",
    delivered: "Delivered",
  },
  nextStepPre:
    "Finish your brief in the chat, then request a human review to start sourcing.",
  nextStep: {
    brief_submitted:
      "Your account manager will review your brief and reach out shortly.",
    in_review:
      "Your account manager is reviewing your brief. You will hear from them within 24 hours.",
    suppliers_contacted:
      "We are contacting verified suppliers that match your brief.",
    quotes_received:
      "Quotes are in. Your account manager will share the best options with you.",
    proposal_negotiation:
      "Your account manager is negotiating terms on your behalf.",
    order_production:
      "Your order is in production. We will keep you updated on progress.",
    inspection_logistics:
      "Quality inspection and shipping arrangements are underway.",
    delivered:
      "Your order has been delivered. Message your account manager with any questions.",
  },
};

// English "2h ago" / "yesterday" style relative time via the built-in
// Intl.RelativeTimeFormat (lib/timeAgo.ts predates this; this variant
// gives "yesterday"-style phrasing via numeric: "auto").
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  try {
    const rtf = new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
      style: "narrow",
    });
    for (const [unit, sec] of RELATIVE_UNITS) {
      if (abs >= sec) return rtf.format(Math.trunc(diffSec / sec), unit);
    }
    return rtf.format(0, "minute");
  } catch {
    return "";
  }
}
