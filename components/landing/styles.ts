// Shared class strings for the marketing pages, so type sizes, measure
// and spacing stay identical from section to section and page to page.
// Desktop / mobile targets: hero 60 / 38px, section 44 / 30px,
// subhead 24 / 20px, body 17 / 16px, labels 13 to 14px.

export const H1 =
  "type-display font-bold text-ink text-[clamp(2.25rem,1.55rem+2.6vw,3.75rem)] leading-[1.05] tracking-[-0.02em]";

export const H2 =
  "type-display font-semibold text-ink text-[clamp(1.75rem,1.35rem+1.6vw,2.75rem)] leading-[1.12] tracking-[-0.015em] max-w-[24ch]";

export const H3 =
  "type-title font-semibold text-ink text-[clamp(1.1875rem,1.1rem+0.35vw,1.4375rem)] leading-[1.25] text-balance";

export const LEAD =
  "text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-[1.6] max-w-[58ch] text-ink-soft";

export const BODY = "text-base leading-[1.65] max-w-[60ch] text-ink-soft";

// Small condensed label (step "who", panel captions).
export const LABEL = "type-data text-[13px] font-medium text-ink-soft";

// Vertical rhythm for every marketing section.
export const SECTION = "py-[clamp(64px,9vw,128px)]";

// The first section of an inner page clears the fixed header.
export const PAGE_TOP = "pt-[calc(var(--nav-h)+clamp(40px,7vw,96px))]";

// Text link with a trailing arrow ("How it works →").
export const ARROW_LINK =
  "group inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink underline decoration-rule-strong decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-2 focus-visible:ring-offset-sheet";

// Segmented control (language pickers, filters).
export const SEG =
  "inline-flex max-w-full flex-wrap overflow-hidden rounded-sm border border-rule-strong";
export const SEG_BTN =
  "min-h-10 border-r border-rule px-3 py-2 text-sm font-medium text-ink-soft transition-colors last:border-r-0 hover:text-ink aria-pressed:bg-ink aria-pressed:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blueprint";
