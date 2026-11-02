"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import posthog from "posthog-js";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export type UserRole = "buyer" | "account_manager" | null;

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  // Anonymous users count as "not signed in" for UX purposes.
  isAnonymous: boolean;
  isSignedIn: boolean; // truthy AND not anonymous
  role: UserRole;
  roleLoading: boolean;
  // Re-read the session from cookie storage. Call after a route handler
  // set the auth cookie server-side (first visit: /api/chat/start signs
  // the visitor in anonymously). The browser client doesn't emit an auth
  // event for cookies written by the server.
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * One auth subscription for the whole app, mounted in app/layout.tsx.
 *
 * Previously every consumer (Header, Footer, AccountMenu, ChatSidebar,
 * useSessionsList, PostHogIdentify) ran its own supabase.auth.getUser():
 * a network round trip each, and auth-js serializes them behind one lock,
 * so a page paid 4+ sequential Auth calls before rendering auth-aware UI.
 * Here, onAuthStateChange's INITIAL_SESSION event delivers the session
 * from cookie storage with no network call. The user object is the
 * client-side view, which is fine for UI: every server route verifies the
 * JWT itself.
 *
 * The role (public.users.role) is fetched once per permanent user id,
 * never for anonymous visitors.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleState, setRoleState] = useState<{
    forUserId: string | null;
    role: UserRole;
  }>({ forUserId: null, role: null });

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  const permanentUserId = user && !user.is_anonymous ? user.id : null;
  useEffect(() => {
    if (!permanentUserId) return;
    let cancelled = false;
    const supabase = getSupabaseBrowser();
    supabase
      .from("users")
      .select("role")
      .eq("id", permanentUserId)
      .maybeSingle()
      .then(
        ({
          data,
          error,
        }: {
          data: { role?: UserRole } | null;
          error: unknown;
        }) => {
          if (cancelled) return;
          setRoleState({
            forUserId: permanentUserId,
            role: error ? null : (data?.role ?? null),
          });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [permanentUserId]);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user ?? null);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    // Reset synchronously: the redirect below can unload the page before
    // PostHogIdentify's effect would observe the signed-out state.
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.reset();
    // Full reload so the next request bootstraps a fresh anonymous session
    // rather than leaving the app in a half-state.
    if (typeof window !== "undefined") window.location.href = "/";
  }, []);

  // Role is derived at read time: it only counts once it was fetched for
  // the CURRENT permanent user, so a stale role can't leak across a
  // sign-out / sign-in, and anonymous users always read as null.
  const role = permanentUserId && roleState.forUserId === permanentUserId
    ? roleState.role
    : null;
  const roleLoading =
    loading || (permanentUserId !== null && roleState.forUserId !== permanentUserId);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAnonymous: Boolean(user?.is_anonymous),
      isSignedIn: Boolean(user && !user.is_anonymous),
      role,
      roleLoading,
      refresh,
      signOut,
    }),
    [user, loading, role, roleLoading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const FALLBACK: AuthContextValue = {
  user: null,
  loading: true,
  isAnonymous: true,
  isSignedIn: false,
  role: null,
  roleLoading: true,
  refresh: async () => {},
  signOut: async () => {},
};

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("useAuthContext called outside <AuthProvider>");
    }
    return FALLBACK;
  }
  return ctx;
}
