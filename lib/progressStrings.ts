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
import type { DateGroup, RequestFilter } from "@/lib/requestFilters";
import type { PaymentStatus } from "@/lib/supabase/types";

export type WorkspaceTab = "chat" | "documents" | "payments";

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
  // App shell: sidebar
  searchPlaceholder: string;
  searchAria: string;
  noMatches: string;
  filterAria: string;
  filterLabel: Record<RequestFilter, string>;
  filterEmpty: Record<RequestFilter, string>;
  dateGroup: Record<DateGroup, string>;
  collapseSidebar: string;
  expandSidebar: string;
  // App shell: request workspace tabs
  tabsAria: string;
  tabLabel: Record<WorkspaceTab, string>;
  orderFile: string;
  // Documents tab
  documentsTitle: string;
  documentsLead: string;
  documentsEmptyDraft: string;
  documentsEmpty: string;
  documentFrom: string;
  documentDownload: string;
  documentUnavailable: string;
  documentTag: { image: string; file: string };
  showInChat: string;
  // Payments tab
  paymentsTitle: string;
  paymentsLead: string;
  paymentsEmptyDraft: string;
  paymentsEmpty: string;
  paymentsOutstanding: string;
  paymentsAllSettled: string;
  payNow: string;
  paymentTag: string;
  paymentStatus: Record<PaymentStatus, string>;
  paymentsTrust: string;
  loadingItems: string;
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
  searchPlaceholder: "Search requests",
  searchAria: "Search your requests",
  noMatches: "No requests match your search.",
  filterAria: "Filter requests by status",
  filterLabel: {
    all: "All",
    draft: "Drafts",
    active: "In progress",
    done: "Completed",
  },
  filterEmpty: {
    all: "No requests yet.",
    draft: "No drafts. Every brief has been sent for review.",
    active: "Nothing in progress. Send a brief for review to start sourcing.",
    done: "No completed orders yet.",
  },
  dateGroup: {
    today: "Today",
    week: "Previous 7 days",
    month: "Previous 30 days",
    older: "Older",
  },
  collapseSidebar: "Collapse sidebar",
  expandSidebar: "Expand sidebar",
  tabsAria: "Request sections",
  tabLabel: {
    chat: "Chat",
    documents: "Documents",
    payments: "Payments",
  },
  orderFile: "Order file",
  documentsTitle: "Documents",
  documentsLead:
    "Every file your account manager sends for this request: offers, audit reports, contracts, invoices and shipping papers.",
  documentsEmptyDraft:
    "Documents arrive once your account manager starts working on this request. Finish your brief and request a human review first.",
  documentsEmpty:
    "No documents yet. Offers, audit reports and contracts for this request will appear here as your account manager sends them.",
  documentFrom: "From your account manager",
  documentDownload: "Download",
  documentUnavailable: "Unavailable",
  documentTag: { image: "Image", file: "Document" },
  showInChat: "Show in chat",
  paymentsTitle: "Payments",
  paymentsLead:
    "Payment links for this request. Pay only from links listed here.",
  paymentsEmptyDraft:
    "Payment links arrive after your account manager has agreed terms with you. Finish your brief and request a human review first.",
  paymentsEmpty:
    "No payment links yet. When a deposit or balance is due, the link will appear here.",
  paymentsOutstanding: "Outstanding",
  paymentsAllSettled: "Nothing outstanding",
  payNow: "Pay now",
  paymentTag: "Payment",
  paymentStatus: {
    pending: "Awaiting payment",
    paid: "Paid",
    cancelled: "Cancelled",
  },
  paymentsTrust:
    "Nexcierge is the only place your payment goes. We never send bank details by email; if anyone does, tell your account manager.",
  loadingItems: "Loading…",
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
