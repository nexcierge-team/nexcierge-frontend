import { PostHog } from "posthog-node";

// Server-side PostHog capture for Route Handlers. Mirrors the backend's
// app/analytics.py contract: no-ops without the key, never throws — a
// telemetry failure must never break a request.
//
// flushAt 1 / flushInterval 0 → each event is sent immediately instead of
// batched, since serverless route handlers may freeze right after the
// response and never get a chance to flush a batch.
let _client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (_client !== undefined) return _client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  _client = key
    ? new PostHog(key, {
        host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        flushAt: 1,
        flushInterval: 0,
      })
    : null;
  return _client;
}

export function captureServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    getClient()?.capture({ distinctId, event, properties });
  } catch (e) {
    console.error(`posthog capture failed for ${event}:`, e);
  }
}

// Report a server-side exception to PostHog as a `$exception` event.
// Used by instrumentation.ts's onRequestError hook so uncaught errors in
// Route Handlers / RSC / SSR are visible alongside browser exceptions.
// distinctId ties the error to a person when we can resolve one (from the
// PostHog browser cookie); omit it and PostHog scopes the event to the
// exception itself. No-ops without the key, never throws.
export function captureServerException(
  error: unknown,
  distinctId?: string,
  properties?: Record<string, unknown>,
): void {
  try {
    getClient()?.captureException(error, distinctId, properties);
  } catch (e) {
    console.error("posthog captureException failed:", e);
  }
}
