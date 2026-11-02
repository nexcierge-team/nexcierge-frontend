import { isAuthError, type JwtPayload } from "@supabase/supabase-js";
import { getSupabaseServer } from "./server";

export interface RouteAuth {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
  fullName: string | null;
  // The verified access token this request was authenticated with. Used to
  // build a non-refreshing client for writes that happen after a streamed
  // response has started (see getSupabaseWithAccessToken in ./server).
  accessToken: string;
}

type SupabaseServer = Awaited<ReturnType<typeof getSupabaseServer>>;

// "none": no usable session at all (no cookie, refresh token rejected, or
// the JWT no longer verifies). Safe to bootstrap a fresh anonymous user.
// "error": a transient failure (network to Auth / JWKS). We must NOT mint
// a new anonymous identity here, or a blip would orphan the buyer's chat.
type ClaimsResult =
  | { kind: "ok"; auth: RouteAuth }
  | { kind: "none" }
  | { kind: "error"; error: unknown };

function claimsToAuth(claims: JwtPayload, accessToken: string): RouteAuth {
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  return {
    userId: claims.sub,
    email: claims.email ? claims.email : null,
    isAnonymous: Boolean(claims.is_anonymous),
    fullName: name,
    accessToken,
  };
}

/**
 * Verify the request's JWT. With asymmetric signing keys enabled on the
 * Supabase project this is a LOCAL signature check (JWKS cached per
 * process), not a round trip to the Auth server. With legacy HS256 keys,
 * auth-js falls back to a getUser() network call: same cost as before, so
 * this is safe to ship ahead of the dashboard key migration.
 *
 * Trade-off vs getUser(): a revoked session stays valid until its JWT
 * expires (at most 1 h). PostgREST already behaves this way for every DB
 * query, so it isn't a regression. See docs/ARCHITECTURE.md § Auth.
 */
async function resolveClaims(supabase: SupabaseServer): Promise<ClaimsResult> {
  try {
    // getSession() reads the cookie and refreshes it if it's about to
    // expire (the proxy normally already did). We only use the token from
    // it; identity comes from the verified claims below.
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessionError || !token) {
      return sessionError && !isAuthError(sessionError)
        ? { kind: "error", error: sessionError }
        : { kind: "none" };
    }
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return error && !isAuthError(error)
        ? { kind: "error", error }
        : { kind: "none" };
    }
    return { kind: "ok", auth: claimsToAuth(data.claims, token) };
  } catch (e) {
    // getClaims throws (rather than returning) on non-auth failures such
    // as a JWKS fetch error.
    return { kind: "error", error: e };
  }
}

/**
 * Resolve the current user in a Route Handler. Bootstraps an anonymous
 * Supabase session if no JWT exists yet, so the very first
 * /api/chat/start request creates a real auth.users row the rest of the
 * flow can reference.
 *
 * Returns null on hard auth failure (Supabase env missing, anonymous
 * sign-up disabled, or a transient Auth outage). Callers should treat
 * null as a 500-level error, not "not signed in".
 */
export async function getOrCreateUser(): Promise<RouteAuth | null> {
  const supabase = await getSupabaseServer();
  const result = await resolveClaims(supabase);
  if (result.kind === "ok") return result.auth;
  if (result.kind === "error") {
    console.error("auth verification failed:", result.error);
    return null;
  }

  // No session yet. Sign in anonymously so the rest of the flow has a
  // real user_id to write against.
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user || !data.session) {
    console.error("anonymous sign-in failed:", error);
    return null;
  }
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: true,
    fullName: null,
    accessToken: data.session.access_token,
  };
}

/**
 * Same as above but does NOT auto-create. Returns null if there is no
 * (verifiable) session. Use this where missing auth is a 401 or an empty
 * result, never a reason to mint a new anonymous user.
 */
export async function getUser(): Promise<RouteAuth | null> {
  const supabase = await getSupabaseServer();
  const result = await resolveClaims(supabase);
  if (result.kind === "error") {
    console.error("auth verification failed:", result.error);
    return null;
  }
  return result.kind === "ok" ? result.auth : null;
}
