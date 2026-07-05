// Client-side PostHog bootstrap. Runs once per page load, after the HTML
// document loads and before React hydration (Next.js instrumentation-client
// convention). Pageviews are captured automatically on App Router
// navigations via the `defaults` preset's history-change tracking.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

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
  });
}
