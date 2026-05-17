import { NextRequest, NextResponse } from "next/server";

/**
 * Two-layer HTTP Basic Auth.
 *
 * 1. SITE PREVIEW PASSWORD (`BASIC_AUTH_USER` + `BASIC_AUTH_PASSWORD`)
 *    Required for all pages and API routes EXCEPT `/dashboard*`. Shared with
 *    coworkers / stakeholders who need to see the public surfaces during the
 *    private preview.
 *
 * 2. ADMIN PASSWORD (`ADMIN_USER` + `ADMIN_PASSWORD`)
 *    Required for `/dashboard*`. The dashboard is mock data today but is a
 *    privileged surface — only Nexcierge team members should see it until
 *    real buyer auth (magic link) lands. Browser caches credentials per
 *    realm, so admins are prompted once per session.
 *
 * Either layer is disabled when its env vars are unset (e.g. local dev).
 * Public launch: delete both pairs of env vars.
 */

const ADMIN_PATH_PREFIX = "/dashboard";

function checkAuth(
  req: NextRequest,
  user: string,
  pass: string,
  realm: string,
): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const idx = decoded.indexOf(":");
        const u = decoded.slice(0, idx);
        const p = decoded.slice(idx + 1);
        if (u === user && p === pass) {
          return null; // pass
        }
      } catch {
        // fall through to 401
      }
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}"`,
    },
  });
}

export function proxy(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const isAdminRoute = pathname.startsWith(ADMIN_PATH_PREFIX);

  if (isAdminRoute) {
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (adminUser && adminPass) {
      const fail = checkAuth(req, adminUser, adminPass, "Nexcierge admin");
      if (fail) return fail;
    }
    return NextResponse.next();
  }

  const siteUser = process.env.BASIC_AUTH_USER;
  const sitePass = process.env.BASIC_AUTH_PASSWORD;
  if (siteUser && sitePass) {
    const fail = checkAuth(
      req,
      siteUser,
      sitePass,
      "Nexcierge - private preview",
    );
    if (fail) return fail;
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route EXCEPT Next.js internals and static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|illustrations/).*)",
  ],
};
