"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export type UserRole = "buyer" | "account_manager" | null;

interface RoleState {
  role: UserRole;
  loading: boolean;
}

// Mirrors `public.users.role` for the current session, refreshed on
// every auth state change. Anonymous / signed-out users resolve to null.
export function useUserRole(): RoleState {
  const [state, setState] = useState<RoleState>({ role: null, loading: true });

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;

    async function fetchRole(userId: string | null, isAnonymous: boolean) {
      if (!userId || isAnonymous) {
        if (!cancelled) setState({ role: null, loading: false });
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setState({ role: null, loading: false });
        return;
      }
      setState({
        role: ((data as { role?: UserRole } | null)?.role ?? null) as UserRole,
        loading: false,
      });
    }

    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        const user = data.user ?? null;
        fetchRole(user?.id ?? null, Boolean(user?.is_anonymous));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const user = session?.user ?? null;
        fetchRole(user?.id ?? null, Boolean(user?.is_anonymous));
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
