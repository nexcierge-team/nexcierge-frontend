import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Fixed-window rate limiting backed by Supabase Postgres via the
// public.check_rate_limit RPC. One round trip per check (~10-30ms in
// our region), which is invisible next to a 2-5s Gemini call but
// noticeable on the cheap routes — that's the cost of not adding a
// dedicated Redis vendor for this.
//
// Keying convention: "<scope>:<dim>:<id>" — scope identifies the route
// or feature, dim says whether the id is a user/ip/session, and id is
// the actual value. Each (scope, dim, id) tuple gets one window in the
// table. Same identifier under different scopes counts independently.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

interface CheckRateLimitRow {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail OPEN. If the rate-limit table or RPC is broken, we'd rather
    // let traffic through than wedge the entire app. Log loudly so the
    // outage is visible.
    console.error("rate limit check failed (failing open):", error);
    return {
      allowed: true,
      remaining: max,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
  // RPC returns SETOF — Supabase gives us an array of rows.
  const row = (Array.isArray(data) ? data[0] : data) as
    | CheckRateLimitRow
    | undefined;
  if (!row) {
    console.error("rate limit RPC returned no rows (failing open)");
    return {
      allowed: true,
      remaining: max,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at),
  };
}

// Standard 429 response carrying the rate-limit headers clients expect.
// Pass the result from a `checkRateLimit` call that returned
// allowed=false. Body shape is intentionally minimal — clients should
// surface a generic "too many requests" message and back off.
export function rateLimited429(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
  );
  return NextResponse.json(
    {
      error: "rate_limited",
      message: "Too many requests. Please slow down.",
      retry_after_seconds: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    },
  );
}

// Extract the calling client's IP from the request headers Vercel sets.
// Vercel populates x-forwarded-for with the client first; we take the
// leftmost entry. Fall back to x-real-ip, then to "unknown" so the
// table still gets a key (an attacker that strips both headers ends up
// sharing the "unknown" bucket with all other strippers — effectively
// a single noisy slot that hits its limit fast).
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
