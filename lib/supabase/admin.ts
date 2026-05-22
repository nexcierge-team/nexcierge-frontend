import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env";

// Service-role client. Bypasses RLS — use only for writes that the
// authenticated user couldn't (or shouldn't) make themselves: inserting
// `ai` and `system` messages, writing HubSpot IDs back to rfqs, etc.
//
// NEVER import this into a "use client" file. Server runtime only.
//
// Untyped until `supabase gen types` populates lib/supabase/types.ts.
let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient(SUPABASE_URL(), SUPABASE_SERVICE_ROLE_KEY(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
