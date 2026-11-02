import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

// RLS-scoped client pinned to ONE already-verified access token, with no
// cookie access and no auto-refresh.
//
// Use it for writes that may happen after a streamed response has started
// (POST /api/chat). The cookie-backed client above refreshes the session
// whenever a token is near expiry, and after the response headers are
// sent that refresh can't write its Set-Cookie: the rotated refresh token
// would be lost, and Supabase's refresh-token reuse detection can then
// sign the buyer out (an anonymous buyer would lose their chat). Pinning
// the token avoids any refresh. RLS and the immutable-column triggers
// still apply because requests carry the user's JWT.
//
// The proxy refreshes tokens with less than ~90 s left, and the chat
// route's maxDuration is 60 s, so a token verified at request start stays
// valid for the whole turn.
export function getSupabaseWithAccessToken(accessToken: string) {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
