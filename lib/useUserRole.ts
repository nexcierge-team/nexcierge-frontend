"use client";

import { useAuthContext, type UserRole } from "@/components/auth/AuthProvider";

export type { UserRole };

interface RoleState {
  role: UserRole;
  loading: boolean;
}

// Mirrors `public.users.role` for the current session. Anonymous /
// signed-out users resolve to null. Backed by <AuthProvider>, which
// fetches the role once per permanent user (previously every Header and
// Footer instance ran getUser() plus a users select on each navigation).
export function useUserRole(): RoleState {
  const { role, roleLoading } = useAuthContext();
  return { role, loading: roleLoading };
}
