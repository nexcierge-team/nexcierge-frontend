// Supported buyer-output languages. Mirrors backend/app/languages.py —
// keep the two in sync. `code` is ISO 639-1 and is what we persist to
// chat_sessions.language and pass into the backend.
//
// `nativeName` drives the picker label so a Chinese buyer recognises
// "中文" without needing English literacy. `englishName` is shown next to
// it in a smaller mute for everyone else.

export interface LanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "zh", nativeName: "中文", englishName: "Chinese" },
  { code: "es", nativeName: "Español", englishName: "Spanish" },
  { code: "de", nativeName: "Deutsch", englishName: "German" },
  { code: "fr", nativeName: "Français", englishName: "French" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese" },
  { code: "ko", nativeName: "한국어", englishName: "Korean" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic" },
  { code: "ru", nativeName: "Русский", englishName: "Russian" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
];

const CODE_SET = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function isSupportedLanguage(code: string): boolean {
  return CODE_SET.has(code);
}

export function getLanguageOption(code: string): LanguageOption {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0]
  );
}
