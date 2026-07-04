// Service-to-service auth for the FastAPI backend (SECURITY_AUDIT #2).
//
// The backend is a public Render web service, so every server-side call from
// the Next.js layer carries a shared secret in the x-internal-token header;
// the backend rejects anything without it (401). The browser never calls the
// backend directly -- all traffic is proxied through Route Handlers -- so this
// secret stays server-only (no NEXT_PUBLIC_ prefix).

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Base headers for a JSON POST to the backend, including the internal token
// when BACKEND_SHARED_SECRET is set. Locally the secret is usually unset and
// the backend skips the check, so dev needs no extra config.
export function backendHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const secret = process.env.BACKEND_SHARED_SECRET;
  if (secret) headers["x-internal-token"] = secret;
  return headers;
}
