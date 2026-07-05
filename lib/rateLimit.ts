import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { captureServer } from "@/lib/analytics";

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

export interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

// Per-route rate-limit policy — the single place limits are defined.
// Property names mirror the key scope each route uses (see the keying
// convention above); the call site still builds the full key string.
export const RATE_LIMITS = {
  // POST /api/chat, per user. Generous for a human typing but tight
  // enough to bound automated amplification of Gemini spend.
  chat: { max: 40, windowSeconds: 60 },
  // POST /api/chat/start, per IP. Caps anonymous auth.users creation
  // at ~1500/day per source IP.
  chatStart: { max: 60, windowSeconds: 3600 },
  // POST /api/request-review, per user. Stops accidental
  // double-clicks-after-422 from creating a CRM mess.
  requestReview: { max: 5, windowSeconds: 3600 },
  // POST /api/am/sessions/[id]/messages, per AM. Each message can
  // trigger a paid translation call; AMs are humans, not scripts.
  amMessages: { max: 120, windowSeconds: 60 },
  // POST /api/am/sessions/[id]/translate, per AM. Toggling display
  // languages stays well under this because translations are cached.
  amTranslate: { max: 60, windowSeconds: 60 },
  // POST /api/am/sessions/[id]/lessons, per AM. Each click is a paid
  // Gemini call over a full transcript.
  amLessons: { max: 20, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitConfig>;

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
  { max, windowSeconds }: RateLimitConfig,
): Promise<RateLimitResult> {
  const admin = getSupabaseAdmin();
  // `as never` on the args: the admin client is created without the
  // <Database> generic (see lib/supabase/admin.ts — the hand-rolled
  // Database type can't satisfy GenericSchema cleanly without breaking
  // .insert() typings on the lib/db helpers). Without a typed Functions
  // map the RPC signature collapses to "no args" and rejects our object.
  // The cast bypasses that; the response shape is asserted below.
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  } as never);
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
  if (!row.allowed) {
    // Operational alarm — a spike here means a bot, a stuck client, or a
    // limit set too tight. The key's trailing segment is the user id / ip,
    // so breakdowns by `key` show who's hitting which wall.
    const id = key.split(":").pop() ?? "unknown";
    captureServer(id, "rate_limited", { key, scope: key.split(":")[0] });
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
