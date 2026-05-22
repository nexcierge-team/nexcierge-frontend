import { getSupabaseServer } from "./server";

export interface RouteAuth {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
  fullName: string | null;
}

/**
 * Resolve the current user in a Route Handler. Bootstraps an anonymous
 * Supabase session if no JWT exists yet — that way the very first
 * /api/chat/start request creates a real auth.users row the rest of the
 * flow can reference.
 *
 * Returns null only on hard auth failure (Supabase env missing or
 * anonymous sign-up explicitly disabled). Callers should treat null as
 * a 500-level configuration error, not "not signed in".
 */
export async function getOrCreateUser(): Promise<RouteAuth | null> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      userId: user.id,
      email: user.email ?? null,
      isAnonymous: Boolean(user.is_anonymous),
      fullName:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
    };
  }

  // No session yet — sign in anonymously so the rest of the flow has a
  // real user_id to write against.
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    console.error("anonymous sign-in failed:", error);
    return null;
  }
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: true,
    fullName: null,
  };
}

/**
 * Same as above but does NOT auto-create. Returns null if no session.
 * Use this in routes where missing auth is a 401 (e.g. AM-only routes).
 */
export async function getUser(): Promise<RouteAuth | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    userId: user.id,
    email: user.email ?? null,
    isAnonymous: Boolean(user.is_anonymous),
    fullName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
  };
}
