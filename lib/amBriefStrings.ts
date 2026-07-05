// English strings for the AM-only "Brief details" sidebar chrome (status
// pill, CRM section, rating card, claim button). The AM display language
// selector translates ONLY the chat thread — the entire sidebar, like the
// RFQ reading surface, is pinned to English so it stays canonical against
// HubSpot/CRM records. Kept as one typed table so BriefPane, BriefSummary,
// and RatingSection share a single source.

export interface AmBriefStrings {
  briefDetailsTitle: string;
  sectionCrm: string;
  statusInProgress: string;
  statusSubmitted: string;
  statusWon: string;
  statusLost: string;
  hubspotDealPrefix: string;
  notPushedToHubspot: string;
  sessionIdLabel: string;
  claimBrief: string;
  noSpecsCaptured: string;
  // Lead-rating card (AI interview quality)
  sectionRating: string;
  ratingQuestion: string;
  qualityQualified: string;
  qualityPartial: string;
  qualityJunk: string;
  issuesQuestion: string;
  issueMachineType: string;
  issueSpecs: string;
  issueQuantity: string;
  issueDelivery: string;
  issueTimeline: string;
  issueContact: string;
  noteLabel: string;
  notePlaceholder: string;
  saveRating: string;
  savingRating: string;
  ratedLabel: string;
  editRating: string;
  claimToRate: string;
  ratingFailed: string;
  // Lesson generation
  generateLessons: string;
  generatingLessons: string;
  lessonsProposedSuffix: string;
  noLessonsProposed: string;
  lessonsFailed: string;
}

export const AM_BRIEF_EN: AmBriefStrings = {
  briefDetailsTitle: "Brief details",
  sectionCrm: "CRM",
  statusInProgress: "In progress",
  statusSubmitted: "Submitted",
  statusWon: "Won",
  statusLost: "Lost",
  hubspotDealPrefix: "HubSpot deal",
  notPushedToHubspot: "Not yet pushed to HubSpot.",
  sessionIdLabel: "Session ID",
  claimBrief: "Claim this brief",
  noSpecsCaptured: "No technical specs captured.",
  sectionRating: "AI interview quality",
  ratingQuestion: "How usable is this brief?",
  qualityQualified: "Qualified",
  qualityPartial: "Partial",
  qualityJunk: "Junk",
  issuesQuestion: "Anything wrong or missing?",
  issueMachineType: "Machine type",
  issueSpecs: "Specs",
  issueQuantity: "Quantity",
  issueDelivery: "Delivery",
  issueTimeline: "Timeline",
  issueContact: "Contact info",
  noteLabel: "Note (optional)",
  notePlaceholder: "e.g. buyer actually wants used, not new",
  saveRating: "Save rating",
  savingRating: "Saving…",
  ratedLabel: "Rated",
  editRating: "Edit",
  claimToRate: "Claim this brief to rate it.",
  ratingFailed: "Saving failed — try again.",
  generateLessons: "Generate lessons",
  generatingLessons: "Drafting…",
  lessonsProposedSuffix: "lesson(s) proposed — review under Lessons",
  noLessonsProposed: "No new lessons from this review.",
  lessonsFailed: "Generation failed — try again.",
};
