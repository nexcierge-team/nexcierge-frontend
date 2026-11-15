// Canonical English copy for the handoff close + AM welcome, used by the
// request-review flow so the wording never drifts across sessions or machine
// types. These are deterministically localized into the buyer's session
// language at insert time (request-review/route.ts) via `translateText`, with
// English as the fallback — so the buyer reads them in their own language
// while the wording stays fixed.

export const HANDOFF_REPLY =
  "Thank you! Your brief has been sent to our account manager, " +
  "who will get back to you within 24 hours.";

export const DIVIDER_LABEL = "Account manager";

export function accountManagerWelcome(firstName: string): string {
  const greeting = firstName ? `Hi ${firstName}, ` : "Hi there, ";
  return (
    `${greeting}I'm your Nexcierge account manager. I've received your ` +
    `sourcing brief and I'll be in touch within 24 hours with next steps. ` +
    `Feel free to drop any extra notes here in the meantime.`
  );
}

export function firstNameFromFull(full: string | null | undefined): string {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

// sessionStorage key for a message typed into the landing page's agent
// console. Typed text is buyer free text, so it travels to /chat through
// storage instead of the `?seed=` query param (which only ever carries the
// canned starter chips). /chat reads and clears it on arrival.
export const LANDING_SEED_KEY = "nx_landing_seed";

// Upper bound on a landing-typed seed, to keep a pasted wall of text out
// of storage. Well above any realistic first message.
export const LANDING_SEED_MAX = 2000;

// Empty-state starter prompts on /chat.
export const SUGGESTED_PROMPTS = [
  "Injection molding machine for plastic parts",
  "PET bottle blowing machine",
  "Rubber molding press",
  "Pulp moulding machinery for paper tableware",
];
