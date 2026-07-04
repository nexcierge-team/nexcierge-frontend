-- Lock down public.users so buyers cannot self-promote to account_manager.
--
-- SECURITY_AUDIT 2026-07-03, finding #1 (CRITICAL). The users_update_own
-- policy in 0004 gated WHICH row could be updated (auth.uid() = id) but put
-- no restriction on WHICH columns. public.users holds the authorization-
-- critical `role` column, and Supabase's default GRANT ALL ... TO
-- authenticated therefore let any logged-in user PATCH their own row with
-- {"role":"account_manager"} straight to PostgREST -- every visitor gets an
-- anonymous `authenticated` JWT -- bypassing the API-layer guards, then read
-- every buyer's rows via is_account_manager(). Full-PII breach.
--
-- No client code writes to public.users: the handle_auth_user security-
-- definer trigger (0001) syncs email/full_name from auth.users, and the two
-- role lookups (lib/supabase/role.ts, lib/useUserRole.ts) are SELECTs. So we
-- remove client UPDATE entirely and add a trigger as the real safety net
-- (mirrors the immutable-column triggers in 0008).
--
-- Legitimate role promotion is done by an operator in the Supabase SQL
-- console (runs as `postgres`) or via the service-role client; both bypass
-- the client-role check in the trigger below.

-- 1) Remove the client's ability to UPDATE any column of public.users.
--    SELECT is untouched; INSERT is handled by the definer trigger.
revoke update on public.users from anon, authenticated;

-- 2) Defense-in-depth: even if a future migration re-grants UPDATE, the
--    PostgREST client roles can never change role or id.
create or replace function public.users_forbid_privileged_change()
returns trigger
language plpgsql
as $$
begin
  -- Only the PostgREST client roles are restricted. service_role (server
  -- admin client), postgres / supabase_admin (SQL-console operator promoting
  -- an AM), and the security-definer handle_auth_user sync all pass through.
  if current_user in ('anon', 'authenticated') then
    if new.role is distinct from old.role then
      raise exception 'users.role is not client-updatable';
    end if;
    if new.id is distinct from old.id then
      raise exception 'users.id is immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_forbid_privileged_change on public.users;
create trigger users_forbid_privileged_change
  before update on public.users
  for each row execute function public.users_forbid_privileged_change();

-- 3) POST-DEPLOY AUDIT — run this and confirm every account_manager is a
--    known teammate. Reset any you don't recognise:
--        update public.users set role = 'buyer' where id = '<uuid>';
--
--    select id, email, role, created_at from public.users where role = 'account_manager';
