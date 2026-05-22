-- Mirror of auth.users for app-side joins + role management.
-- Kept in sync via trigger on auth.users insert/update.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'buyer' check (role in ('buyer','account_manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);

create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_change on auth.users;
create trigger on_auth_user_change
  after insert or update on auth.users
  for each row execute function public.handle_auth_user();
