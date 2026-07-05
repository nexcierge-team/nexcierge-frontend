// Languages an AM can pick to read a buyer's chat thread in. Buyers can
// be in many languages, but the AM team works in these for now (see the
// selector in app/dashboard/page.tsx). Validated by the chat-message
// translate route — a typo'd code is rejected rather than fanning into
// pointless Gemini calls. Note "en" needs a forced translate pass
// downstream — lib/translate.ts short-circuits English targets by default.
export const AM_DISPLAY_LANGUAGES = new Set(["en", "zh", "hi"]);
