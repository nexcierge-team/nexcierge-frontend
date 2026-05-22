// Centralised env access so missing values fail loudly with a useful
// message instead of producing cryptic Supabase errors deep in a query.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in frontend/.env.local — see frontend/supabase/README.md.`,
    );
  }
  return value;
}

export const SUPABASE_URL = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const SUPABASE_ANON_KEY = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

// Server-side only. Bypasses RLS — used for ai/system message inserts
// and admin-style writes. Never import this into client components.
export const SUPABASE_SERVICE_ROLE_KEY = () =>
  required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
