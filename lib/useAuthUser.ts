"use client";

import type { User } from "@supabase/supabase-js";
import { useAuthContext } from "@/components/auth/AuthProvider";

interface AuthState {
  user: User | null;
  loading: boolean;
  // Convenience flags:
  isAnonymous: boolean;
  isSignedIn: boolean; // truthy AND not anonymous
}

/**
 * The current Supabase auth state in any client component.
 *
 * Returns the live user (or null), a `signOut()` helper that clears the
 * session and bounces to `/`, and convenience flags.
 *
 * Anonymous users count as "not signed in" for UX purposes. We want
 * Sign in / Account dropdowns to differentiate between a buyer who has
 * verified their email and the anonymous-by-default state everyone
 * starts in.
 *
 * Reads the single app-wide subscription in <AuthProvider>
 * (components/auth/AuthProvider.tsx) instead of opening its own, so N
 * consumers cost zero extra Auth round trips.
 */
export function useAuthUser(): AuthState & { signOut: () => Promise<void> } {
  const { user, loading, isAnonymous, isSignedIn, signOut } = useAuthContext();
  return { user, loading, isAnonymous, isSignedIn, signOut };
}
