// Static i18n for the handful of AM-only "Brief details" sidebar strings
// that have no buyer-facing equivalent in lib/cardStrings.ts (section
// titles, field labels, and the timeline/condition enum tables ARE reused
// from there — see dashboard/page.tsx's BriefSummary). Scoped to exactly
// the languages the AM selector offers (lib/amLanguages.ts) — there's no
// need for the buyer card's full 11-language set here.

export interface AmBriefStrings {
  briefDetailsTitle: string;
  sectionCrm: string;
  statusInProgress: string;
  statusSubmitted: string;
  statusWon: string;
  statusLost: string;
  hubspotDealPrefix: string;
  notPushedToHubspot: string;
  claimBrief: string;
  noSpecsCaptured: string;
}

const en: AmBriefStrings = {
  briefDetailsTitle: "Brief details",
  sectionCrm: "CRM",
  statusInProgress: "In progress",
  statusSubmitted: "Submitted",
  statusWon: "Won",
  statusLost: "Lost",
  hubspotDealPrefix: "HubSpot deal",
  notPushedToHubspot: "Not yet pushed to HubSpot.",
  claimBrief: "Claim this brief",
  noSpecsCaptured: "No technical specs captured.",
};

const zh: AmBriefStrings = {
  briefDetailsTitle: "简报详情",
  sectionCrm: "CRM",
  statusInProgress: "进行中",
  statusSubmitted: "已提交",
  statusWon: "已成交",
  statusLost: "已流失",
  hubspotDealPrefix: "HubSpot 交易",
  notPushedToHubspot: "尚未推送到 HubSpot。",
  claimBrief: "认领此简报",
  noSpecsCaptured: "尚未采集技术规格。",
};

const hi: AmBriefStrings = {
  briefDetailsTitle: "ब्रीफ़ विवरण",
  sectionCrm: "CRM",
  statusInProgress: "प्रगति पर",
  statusSubmitted: "सबमिट किया गया",
  statusWon: "जीता",
  statusLost: "खोया",
  hubspotDealPrefix: "हबस्पॉट डील",
  notPushedToHubspot: "अभी तक हबस्पॉट पर पुश नहीं किया गया।",
  claimBrief: "इस ब्रीफ़ को क्लेम करें",
  noSpecsCaptured: "अभी तक कोई तकनीकी विनिर्देश दर्ज नहीं हुआ।",
};

const AM_BRIEF_STRINGS: Record<string, AmBriefStrings> = { en, zh, hi };

// Falls back to English for "" (original) or any unsupported code — same
// default cardStrings() uses.
export function amBriefStrings(language: string | undefined): AmBriefStrings {
  return (language && AM_BRIEF_STRINGS[language]) || en;
}
