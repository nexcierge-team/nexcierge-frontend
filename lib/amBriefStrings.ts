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
  sectionRating: "AI 访谈质量",
  ratingQuestion: "这份简报的可用性如何？",
  qualityQualified: "合格",
  qualityPartial: "部分可用",
  qualityJunk: "无效",
  issuesQuestion: "有什么错误或缺失？",
  issueMachineType: "机器类型",
  issueSpecs: "技术规格",
  issueQuantity: "数量",
  issueDelivery: "交付",
  issueTimeline: "时间表",
  issueContact: "联系方式",
  noteLabel: "备注（可选）",
  notePlaceholder: "例如：买家其实想要二手机器",
  saveRating: "保存评价",
  savingRating: "保存中…",
  ratedLabel: "已评价",
  editRating: "编辑",
  claimToRate: "认领此简报后才能评价。",
  ratingFailed: "保存失败，请重试。",
  generateLessons: "生成改进建议",
  generatingLessons: "生成中…",
  lessonsProposedSuffix: "条改进建议待审核（见 Lessons）",
  noLessonsProposed: "本次评审未生成新建议。",
  lessonsFailed: "生成失败，请重试。",
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
  sectionRating: "AI साक्षात्कार गुणवत्ता",
  ratingQuestion: "यह ब्रीफ़ कितना उपयोगी है?",
  qualityQualified: "योग्य",
  qualityPartial: "आंशिक",
  qualityJunk: "बेकार",
  issuesQuestion: "कुछ गलत या छूटा हुआ?",
  issueMachineType: "मशीन प्रकार",
  issueSpecs: "विनिर्देश",
  issueQuantity: "मात्रा",
  issueDelivery: "डिलीवरी",
  issueTimeline: "समयरेखा",
  issueContact: "संपर्क जानकारी",
  noteLabel: "नोट (वैकल्पिक)",
  notePlaceholder: "जैसे: खरीदार वास्तव में पुरानी मशीन चाहता है",
  saveRating: "रेटिंग सहेजें",
  savingRating: "सहेजा जा रहा है…",
  ratedLabel: "रेट किया गया",
  editRating: "संपादित करें",
  claimToRate: "रेट करने के लिए पहले इस ब्रीफ़ को क्लेम करें।",
  ratingFailed: "सहेजना विफल — पुनः प्रयास करें।",
  generateLessons: "सुधार सुझाव बनाएं",
  generatingLessons: "बन रहा है…",
  lessonsProposedSuffix: "सुधार सुझाव समीक्षा हेतु प्रस्तावित (Lessons देखें)",
  noLessonsProposed: "इस समीक्षा से कोई नया सुझाव नहीं।",
  lessonsFailed: "जनरेशन विफल — पुनः प्रयास करें।",
};

const AM_BRIEF_STRINGS: Record<string, AmBriefStrings> = { en, zh, hi };

// Falls back to English for "" (original) or any unsupported code — same
// default cardStrings() uses.
export function amBriefStrings(language: string | undefined): AmBriefStrings {
  return (language && AM_BRIEF_STRINGS[language]) || en;
}
