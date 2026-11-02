import { getSupabaseServer } from "./server";
import { getUser } from "./route";

// Returns the user's `public.users.role` value, or null if no session or
// no mirror row yet (the trigger should always create one — null here is
// either a brand-new anonymous user or a misconfigured project).
export async function getCurrentUserRole(): Promise<
  "buyer" | "account_manager" | null
> {
  const auth = await getUser();
  if (!auth) return null;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.userId)
    .maybeSingle();
  if (error) {
    console.error("role lookup failed:", error);
    return null;
  }
  return (data?.role as "buyer" | "account_manager" | null) ?? null;
}

/**
 * Gate for every /api/am/* route. Identity comes from the locally verified
 * JWT (getClaims, no Auth round trip once asymmetric keys are enabled);
 * the role check is ONE call to the same `is_account_manager()` SQL
 * function the RLS policies use, so the gate and the DB can never disagree
 * about who is an AM. Previously this was getUser() twice plus a users
 * select: three sequential round trips on every AM request.
 */
export async function requireAccountManager(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; reason: string }
> {
  const auth = await getUser();
  if (!auth || auth.isAnonymous) {
    return { ok: false, status: 401, reason: "Not signed in" };
  }
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("is_account_manager");
  if (error) {
    console.error("role check failed:", error);
    return { ok: false, status: 403, reason: "Account-manager role required" };
  }
  if (data !== true) {
    return { ok: false, status: 403, reason: "Account-manager role required" };
  }
  return { ok: true, userId: auth.userId };
}
