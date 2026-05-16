import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic Auth gate for the entire site.
 *
 * Enabled only when BOTH `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` are set
 * in env. If either is missing, requests pass through unauthenticated.
 *
 * - Local dev: leave the vars unset in `.env.local` -> no auth prompt
 * - Vercel preview / production: set the vars in Project Settings -> Environment
 *   to require credentials before any page or API route loads
 *
 * Coworker access: share the URL + the configured username/password over a
 * secure channel. The browser caches credentials per-origin until the user
 * closes all windows, so they enter once.
 *
 * Removing the gate before launch: delete the two env vars in Vercel and
 * trigger a redeploy.
 */
export function proxy(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASSWORD;

  // Auth disabled when either credential is missing.
  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const idx = decoded.indexOf(":");
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        if (user === expectedUser && pass === expectedPass) {
          return NextResponse.next();
        }
      } catch {
        // fall through to 401
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Nexcierge — private preview"',
    },
  });
}

export const config = {
  // Run on every route EXCEPT Next.js internals and static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|illustrations/).*)",
  ],
};
