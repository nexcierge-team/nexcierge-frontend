-- Lock check_rate_limit to the server (service_role) only.
--
-- 0008 granted EXECUTE on public.check_rate_limit to anon + authenticated,
-- so anyone holding the PUBLIC anon key could call it through PostgREST
-- (POST /rest/v1/rpc/check_rate_limit) with an arbitrary key and arguments:
--
--   * bypass: p_window_seconds = 0 makes the stored window look expired,
--     so the call RESETS the counter. An attacker could reset their own
--     `chat:user:<id>` bucket between requests and defeat the per-user
--     Gemini-spend cap (and `chat-start:ip:<ip>`, the anonymous-signup cap).
--   * lockout: repeated calls with someone else's key (`chat:user:<victim>`,
--     `chat-start:ip:<victim ip>`) fill that bucket and 429 a real user.
--
-- The app never needed those grants: lib/rateLimit.ts calls the RPC with
-- the service-role admin client. Supabase's default privileges grant
-- EXECUTE on new public functions to anon / authenticated explicitly, so
-- revoking from PUBLIC alone is not enough; revoke from each role.
-- The function stays SECURITY DEFINER (the rate_limits table remains
-- closed under RLS); only who may invoke it changes.
--
-- Verify after applying (expect only service_role, postgres / owner):
--   select grantee, privilege_type
--   from information_schema.routine_privileges
--   where routine_schema = 'public' and routine_name = 'check_rate_limit';

revoke execute on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, integer, integer)
  to service_role;
