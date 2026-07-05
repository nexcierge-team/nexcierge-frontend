import { type Instrumentation } from "next";

// Server-side error capture. Next.js calls onRequestError for every
// uncaught error thrown in server code (Route Handlers, RSC, SSR,
// proxying) — the counterpart to instrumentation-client.ts's browser
// exception autocapture. We forward each one to PostHog as a $exception
// event so server crashes are visible alongside browser exceptions.
//
// posthog-node has no Edge build, so we only run in the Node.js runtime;
// Edge errors are skipped (all our route handlers run on Node anyway).
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureServerException } = await import("@/lib/analytics");
  captureServerException(err, distinctIdFromCookie(request.headers.cookie), {
    path: request.path,
    method: request.method,
    router: context.routerKind,
    route: context.routePath,
    route_type: context.routeType,
    render_source: context.renderSource,
  });
};

// Best-effort: pull the person's distinct_id from the PostHog browser
// cookie (`ph_<key>_posthog`, a JSON blob) so a server error ties to the
// same person as their browsing history. Undefined when absent/unparsable.
function distinctIdFromCookie(
  cookie: string | string[] | undefined,
): string | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const header = Array.isArray(cookie) ? cookie.join("; ") : cookie;
  if (!header || !key) return undefined;
  const name = `ph_${key}_posthog`;
  const entry = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!entry) return undefined;
  try {
    const parsed = JSON.parse(
      decodeURIComponent(entry.slice(name.length + 1)),
    ) as { distinct_id?: string };
    return parsed.distinct_id;
  } catch {
    return undefined;
  }
}
