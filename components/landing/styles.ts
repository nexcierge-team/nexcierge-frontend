// Shared class strings for the landing sections, so headline and lead
// sizing stay identical from sheet to sheet.

export const H1 =
  "type-display font-extrabold text-[clamp(2.2rem,1.3rem+3.4vw,3.7rem)] leading-[0.98]";

export const H2 =
  "type-display font-extrabold text-[clamp(1.75rem,1.1rem+2.7vw,3.2rem)] leading-[1.03] max-w-[21ch]";

export const H3 = "type-title font-bold text-xl leading-[1.2]";

export const LEAD =
  "text-[clamp(1.05rem,0.98rem+0.35vw,1.25rem)] leading-normal max-w-[58ch] text-ink-soft";

export const SECTION = "relative py-[clamp(60px,8vw,108px)]";

// Segmented control (language pickers, filters).
export const SEG =
  "inline-flex overflow-hidden rounded-sm border-[1.5px] border-ink";
export const SEG_BTN =
  "min-h-9 border-r border-rule-strong px-[11px] py-[7px] text-sm font-semibold transition-colors last:border-r-0 aria-pressed:bg-ink aria-pressed:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blueprint";

// The small condensed tag that says who does a step.
export const TAG =
  "type-data inline-block justify-self-start rounded-[2px] border-[1.5px] border-ink px-2 py-[3px] text-[13px] font-bold";
