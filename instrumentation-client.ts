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
function scrubUrlProps(result: CaptureResult | null): CaptureResult | null {
  if (!result?.properties) return result;
  for (const k of ["$current_url", "$referrer"]) {
    const v = result.properties[k];
    if (typeof v === "string") result.properties[k] = v.replace(/[?#].*$/, "");
  }
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
    // PII guard: scrub URLs on every outgoing event. Buyer free text is
    // kept out of autocapture separately via the `ph-no-capture` class on
    // chat bubbles, the brief card, and AM lead rows.
    before_send: scrubUrlProps,
  });
}
