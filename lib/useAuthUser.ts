"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AuthChangeEvent,
  Session,
  User,
} from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

interface AuthState {
  user: User | null;
  loading: boolean;
  // Convenience flags:
  isAnonymous: boolean;
  isSignedIn: boolean; // truthy AND not anonymous
}

/**
 * Subscribe to the current Supabase auth state in any client component.
 *
 * Returns the live user (or null), a `signOut()` helper that clears the
 * session and bounces to `/`, and convenience flags.
 *
 * Anonymous users count as "not signed in" for UX purposes — we want
 * Sign in / Account dropdowns to differentiate between a buyer who has
 * verified their email and the anonymous-by-default state everyone
 * starts in.
 */
export function useAuthUser(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAnonymous: true,
    isSignedIn: false,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;

    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        if (cancelled) return;
        const user = data.user ?? null;
        setState({
          user,
          loading: false,
          isAnonymous: Boolean(user?.is_anonymous),
          isSignedIn: Boolean(user && !user.is_anonymous),
        });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const user = session?.user ?? null;
        setState({
          user,
          loading: false,
          isAnonymous: Boolean(user?.is_anonymous),
          isSignedIn: Boolean(user && !user.is_anonymous),
        });
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    // Full reload so the proxy re-bootstraps a fresh anonymous session
    // on the next request rather than leaving the app in a half-state.
    if (typeof window !== "undefined") window.location.href = "/";
  }, []);

  return { ...state, signOut };
}
