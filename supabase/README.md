# Supabase setup

One-time setup the human operator does. Once these steps are complete, the rest of the codebase Just Works against whatever Supabase project is wired in `frontend/.env.local`.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com), create a new project. Pick the region closest to your buyers (likely `us-east` or `eu-west`).
2. Wait for the project to provision (~2 min).
3. From **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (under "Reveal") → `SUPABASE_SERVICE_ROLE_KEY` (**server-only — never expose to the client**)

## 2. Run migrations

Easiest path — paste each `.sql` file's contents into the SQL editor in the Supabase dashboard, in order:

```
0001_init_users_and_trigger.sql
0002_chat_sessions_messages.sql
0003_rfqs.sql
0004_rls_policies.sql
0005_optional_cleanup_cron.sql   (skip until pg_cron is enabled)
```

Or, with [supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`):

```bash
cd frontend
supabase link --project-ref <your-project-ref>
supabase db push
```

Run them in the order above. Each is idempotent (uses `if not exists` / `or replace`) so re-running is safe.

## 3. Enable anonymous sign-ins

**Authentication → Providers → Anonymous Sign-Ins → Enable.**

Buyers sign in anonymously the first time they open `/chat`. When they later sign in with Google / email, the server-side `/auth/callback` route migrates their anonymous `chat_sessions` and `rfqs` to the new permanent user via the `nx_pre_signin_uid` cookie set by `POST /api/auth/prepare-signin`. The buyer's UID *does* change across the boundary (different from Supabase's `linkIdentity` model — which we deliberately avoid because it breaks on repeat sign-ins), but the user-visible chat history is preserved.

You do **not** need to enable the "Manual Linking" toggle. We don't call `linkIdentity` anywhere.

## 4. Configure Google OAuth

**Authentication → Providers → Google → Enable.**

You need a Google Cloud OAuth 2.0 Client ID:
1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application.
2. **Authorized JavaScript origins:** add `https://<your-project-ref>.supabase.co`, `http://localhost:3000`, and your prod URL.
3. **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. Paste the Client ID + Secret into the Supabase Google provider config.
5. Save.

## 5. Configure email magic link

**Authentication → Providers → Email → enable Magic Link.** Disable "Confirm email" if you want one-click sign-up (or leave it on for stricter verification).

**SMTP**: Supabase's default sender is rate-limited to 3 emails / hour — fine for early testing, **NOT fine for any external demo**. Before showing to a real user:

1. Sign up at [Resend](https://resend.com), verify your sending domain (add SPF + DKIM records; propagation takes 1–24h).
2. Supabase: **Project Settings → Auth → SMTP Settings** → fill in Resend SMTP details (`smtp.resend.com`, port 465, your API key as the password, your verified `from` address).
3. Test by triggering a magic link to a real inbox.

Verification token TTL: drop **Email OTP Expiration** from the default 1h to 15min for tighter security.

## 6. Customize email templates

**Authentication → Email Templates → Magic Link** — replace the default text (which looks like phishing) with branded Nexcierge copy. Suggested subject: `Sign in to Nexcierge`. Body should mention "you requested this link" and that it expires in 15 minutes.

## 7. (Optional) Enable pg_cron + run 0005

For automatic cleanup of stale anonymous users (30-day TTL):

**Database → Extensions → pg_cron → Enable.**

Then run `0005_optional_cleanup_cron.sql`. Without this, anonymous users accumulate indefinitely (each consumes one MAU).

## 8. Generate TS types (optional, recommended)

```bash
cd frontend
supabase gen types typescript --project-id <your-project-ref> > lib/supabase/types.ts
```

Re-run after every migration. The generated `Database` type powers compile-time safety in `lib/db/*.ts`.

## 9. Realtime configuration

Already handled by migration `0002` (`alter publication supabase_realtime add table public.chat_messages`). Confirm in the dashboard under **Database → Replication → supabase_realtime** that `public.chat_messages` is checked.

## Manual AM promotion

To promote a buyer to account manager (until we build the AM invite flow):

```sql
update public.users set role = 'account_manager' where email = 'sara@nexcierge.com';
```

That email needs an existing user row — have them sign in once first (Google or magic link).

## Local dev tips

- Supabase emulator (`supabase start`) works locally if you don't want to use a cloud project for dev. Migrations run automatically on `supabase start` / `supabase db reset`.
- For the simplest path, just point local dev at your cloud project's dev environment.
