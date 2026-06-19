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
  const greeting = firstName ? `Hi ${firstName} — ` : "Hi there — ";
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
