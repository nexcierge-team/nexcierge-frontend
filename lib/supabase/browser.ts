"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// One Supabase client per browser tab. The @supabase/ssr lib handles
// cookie sync with the server-side client so the same session is visible
// to both runtimes.
//
// Untyped until `supabase gen types` populates lib/supabase/types.ts —
// see note there.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
  }
  return _client;
}
