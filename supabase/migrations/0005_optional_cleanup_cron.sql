-- OPTIONAL: nightly cleanup of stale anonymous users (kept for 30 days
-- after their last sign-in). Cascade-deletes their chat_sessions /
-- chat_messages / rfqs via FK.
--
-- Requires pg_cron. Enable in Supabase dashboard:
--   Database → Extensions → pg_cron → Enable.
--
-- This file is safe to run before the extension is enabled — the DO
-- block detects the extension and no-ops with a NOTICE if absent.

do $outer$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup_stale_anonymous_users',
      '0 3 * * *',
      $job$
        delete from auth.users
        where is_anonymous = true
          and coalesce(last_sign_in_at, created_at) < now() - interval '30 days';
      $job$
    );
    raise notice 'Scheduled cleanup_stale_anonymous_users (03:00 UTC daily).';
  else
    raise notice 'pg_cron not enabled; skipping. Enable via Supabase dashboard and re-run this file.';
  end if;
end
$outer$;
