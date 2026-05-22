import { getSupabaseServer } from "./server";

// Returns the user's `public.users.role` value, or null if no session or
// no mirror row yet (the trigger should always create one — null here is
// either a brand-new anonymous user or a misconfigured project).
export async function getCurrentUserRole(): Promise<
  "buyer" | "account_manager" | null
> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("role lookup failed:", error);
    return null;
  }
  return (data?.role as "buyer" | "account_manager" | null) ?? null;
}

export async function requireAccountManager(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; reason: string }
> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return { ok: false, status: 401, reason: "Not signed in" };
  }
  const role = await getCurrentUserRole();
  if (role !== "account_manager") {
    return { ok: false, status: 403, reason: "Account-manager role required" };
  }
  return { ok: true, userId: user.id };
}
