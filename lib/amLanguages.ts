// Languages an AM can pick to read a buyer's session in. Buyers can be in
// many languages, but the AM team works in these two for now (see the
// selector in app/dashboard/page.tsx). Shared by both AM-facing translate
// routes (chat messages and RFQ brief) so they can't drift out of sync —
// a typo'd code is rejected rather than fanning into pointless Gemini
// calls.
export const AM_DISPLAY_LANGUAGES = new Set(["zh", "hi"]);
