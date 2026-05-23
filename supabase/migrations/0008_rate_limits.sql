-- Generic fixed-window rate-limit store. One row per (key, window).
-- The key encodes both what's being limited and who it's keyed on, e.g.
--   chat:user:<uuid>           (per-user chat rate)
--   chat-start:ip:1.2.3.4      (per-IP anonymous-signup rate)
--   am-msg:user:<uuid>         (per-AM messaging rate)
-- so different limit configurations on the same identifier don't
-- collide. window_start is the timestamp the current window opened;
-- expired rows are detected (and reset) inline by check_rate_limit.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lookups + maintenance scan are both on key; the PK index covers them.
-- Optional housekeeping index on window_start for future pg_cron cleanup
-- (rows whose window expired hours ago can be deleted to keep the table
-- small). Not strictly required for correctness — check_rate_limit
-- resets stale rows in place — but useful for any future cleanup job.
create index if not exists rate_limits_window_idx
  on public.rate_limits(window_start);

-- Atomic check-and-increment.
--
-- Returns three columns:
--   allowed     boolean    — true when the new count is within p_max
--   remaining   integer    — slots left in the current window (0 floor)
--   reset_at    timestamptz — when the current window expires
--
-- Implementation: fixed-window via UPSERT. If the existing window has
-- already expired, we reset count=1 and slide window_start to now;
-- otherwise we increment. Both the read and the write happen inside one
-- INSERT … ON CONFLICT, so two concurrent calls can't both see "under
-- the limit" and over-grant slots.
--
-- security definer + the GRANT below let the user-scoped client invoke
-- this without needing direct table access (RLS on rate_limits stays
-- closed for safety).
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_window_start timestamptz;
begin
  insert into public.rate_limits as rl (key, count, window_start, updated_at)
  values (p_key, 1, v_now, v_now)
  on conflict (key) do update set
    count = case
      when rl.window_start + make_interval(secs => p_window_seconds) <= v_now then 1
      else rl.count + 1
    end,
    window_start = case
      when rl.window_start + make_interval(secs => p_window_seconds) <= v_now then v_now
      else rl.window_start
    end,
    updated_at = v_now
  returning rl.count, rl.window_start
  into v_count, v_window_start;

  return query select
    v_count <= p_max,
    greatest(0, p_max - v_count),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

-- Lock the table down. All access goes through check_rate_limit (which
-- runs as definer and bypasses RLS). No direct client reads or writes.
alter table public.rate_limits enable row level security;

-- Belt-and-suspenders grants. security definer would work without these
-- for the function itself, but being explicit about who can invoke it
-- documents intent and keeps the surface narrow.
grant execute on function public.check_rate_limit(text, integer, integer)
  to anon, authenticated, service_role;
