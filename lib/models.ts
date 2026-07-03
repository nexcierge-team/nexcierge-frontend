// Single source of truth for the Gemini model ids selectable from the AM
// dashboard Settings pane. Used both by the client dropdowns and by the
// /api/am/config PUT validation, so a value can never drift between the two.
// Adding a model is a one-line edit here.
//
// Keep these ids in sync with the pricing table in
// backend/app/llm_tracking.py (`_PRICING_PER_1M`): an id with no matching
// pricing prefix logs NULL cost in llm_call_logs.

export interface GeminiModelOption {
  id: string;
  label: string;
}

// Ordered roughly cheapest → flagship. Labels carry the id too (rendered as
// "<label> · <id>") so the exact string is always visible in the dropdown.
export const GEMINI_MODELS: GeminiModelOption[] = [
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
];

export const GEMINI_MODEL_IDS: string[] = GEMINI_MODELS.map((m) => m.id);

// Narrow an untrusted value to a known model id — used to reject typos in the
// config PUT before they reach the DB (and eventually a live chat turn).
export function isValidModel(id: unknown): id is string {
  return typeof id === "string" && GEMINI_MODEL_IDS.includes(id);
}

// Semantic thinking levels for the pills classifier pass, mapped per model
// family in the backend (`_pills_thinking_config`): Gemini 2.5 → a numeric
// thinking_budget (0 disables); Gemini 3 → a thinking_level enum (can't be
// disabled, so "off"/"low" both floor at LOW). Higher = better pill quality
// but more billed thinking tokens + latency on every turn.
export interface ThinkingLevelOption {
  id: string;
  label: string;
}

export const PILLS_THINKING_LEVELS: ThinkingLevelOption[] = [
  { id: "off", label: "Off — cheapest / fastest" },
  { id: "low", label: "Low (default)" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High — best pill quality" },
];

export const PILLS_THINKING_IDS: string[] = PILLS_THINKING_LEVELS.map(
  (l) => l.id,
);

export function isValidThinkingLevel(id: unknown): id is string {
  return typeof id === "string" && PILLS_THINKING_IDS.includes(id);
}
