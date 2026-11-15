// Client-side PostHog bootstrap. Runs once per page load, after the HTML
// document loads and before React hydration (Next.js instrumentation-client
// convention). Pageviews are captured automatically on App Router
// navigations via the `defaults` preset's history-change tracking.
import posthog, { type CaptureResult } from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Strip query strings + hashes from URL properties before any event
// leaves the browser. Query params can carry auth codes / magic-link
// tokens (`/auth/callback?code=…`) and session ids — none are needed for
// analytics (UTM params are already extracted into their own properties).
// Defense-in-depth alongside the `ph-no-capture` class on buyer-content
// elements, which stops autocapture from recording buyer free text.
//
// posthog-js repeats the page URL under several keys: on the event itself
// (`$current_url`, `$referrer`, `$session_entry_url`,
// `$session_entry_referrer`) and inside the person-property payloads
// (`$set` / `$set_once`: `$current_url`, `$initial_current_url`,
// `$initial_referrer`, ...). All of them are scrubbed, so a query string
// can't leak through a key we forgot.
const URL_PROPS = [
  "$current_url",
  "$referrer",
  "$session_entry_url",
  "$session_entry_referrer",
  "$initial_current_url",
  "$initial_referrer",
  "$prev_pageview_url",
];

function scrubBag(bag: unknown): void {
  if (!bag || typeof bag !== "object") return;
  const props = bag as Record<string, unknown>;
  for (const k of URL_PROPS) {
    const v = props[k];
    if (typeof v === "string") props[k] = v.replace(/[?#].*$/, "");
  }
}

function scrubUrlProps(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;
  scrubBag(result.properties);
  scrubBag(result.properties?.$set);
  scrubBag(result.properties?.$set_once);
  scrubBag(result.$set);
  scrubBag(result.$set_once);
  return result;
}

if (key) {
  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    defaults: "2025-05-24",
    // Autocapture uncaught browser exceptions + unhandled promise
    // rejections as `$exception` events. React render errors are caught
    // by error boundaries before they reach window.onerror, so those are
    // reported explicitly from app/global-error.tsx instead.
    capture_exceptions: true,
    // Core Web Vitals (LCP / INP / CLS / FCP) as `$web_vitals` events, the
    // before/after baseline for the speed work (frontend/docs/TRACKING.md
    // § Performance). Numbers + URL only, no buyer content. Explicit
    // because the project-level remote toggle was off (no $web_vitals
    // events were arriving).
    capture_performance: { web_vitals: true },
    // PII guard: scrub URLs on every outgoing event. Buyer free text is
    // kept out of autocapture separately via the `ph-no-capture` class on
    // chat bubbles, the brief card, and AM lead rows.
    before_send: scrubUrlProps,
  });
}
