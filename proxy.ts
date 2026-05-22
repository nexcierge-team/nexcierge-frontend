import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Edge proxy that:
 *  1. Gates the entire site behind HTTP Basic Auth when `BASIC_AUTH_USER` +
 *     `BASIC_AUTH_PASSWORD` are set. Skipped if either env var is missing.
 *     /auth/* and /api/auth/* are ALWAYS exempt so OAuth callbacks and
 *     magic-link redirects don't get blocked by the prompt.
 *  2. Refreshes the Supabase session cookie on every request. Without
 *     this, anonymous and authenticated sessions silently expire.
 *
 * Removing the Basic Auth gate before launch: delete BASIC_AUTH_USER +
 * BASIC_AUTH_PASSWORD in Vercel and trigger a redeploy.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow auth callbacks through Basic Auth — Google's redirect
  // and Resend's magic link won't carry credentials.
  const isAuthRoute =
    pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/");

  if (!isAuthRoute) {
    const basicAuthBlocked = checkBasicAuth(req);
    if (basicAuthBlocked) return basicAuthBlocked;
  }

  return await refreshSupabaseSession(req);
}

function checkBasicAuth(req: NextRequest): NextResponse | null {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedUser || !expectedPass) return null;

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const idx = decoded.indexOf(":");
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        if (user === expectedUser && pass === expectedPass) return null;
      } catch {
        // fall through to 401
      }
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Nexcierge - private preview"',
    },
  });
}

async function refreshSupabaseSession(req: NextRequest): Promise<NextResponse> {
  // Supabase env may be unset in early-bootstrap environments — degrade
  // gracefully instead of crashing every request.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request: req });

  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value);
        });
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Triggers a refresh-token rotation if needed. Result intentionally
  // ignored — we only care about the side effect.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Run on every route EXCEPT Next.js internals and static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|illustrations/).*)",
  ],
};
