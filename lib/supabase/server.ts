import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Supabase client for Route Handlers / Server Components. Reads + writes
// the JWT via Next's cookies API so anonymous sign-ins and OAuth
// callbacks persist across requests.
//
// Untyped until `supabase gen types` populates lib/supabase/types.ts.
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // cookies() is read-only in Server Components — middleware /
          // proxy handles the refresh path. Safe to ignore here.
        }
      },
    },
  });
}
