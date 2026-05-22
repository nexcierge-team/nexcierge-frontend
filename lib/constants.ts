// Hard-coded copy that must stay identical for every buyer regardless of
// machine type, language, or prior conversation. Used by the request-review
// flow so the handoff close + AM welcome never drift across sessions.

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
