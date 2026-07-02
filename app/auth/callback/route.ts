import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { transferSessionsOwnership } from "@/lib/db/sessions";
import { transferRfqsOwnership } from "@/lib/db/rfqs";
import { captureServer } from "@/lib/analytics";

const PRE_SIGNIN_COOKIE = "nx_pre_signin_uid";

/**
 * Supabase auth callback. Handles two paths:
 *
 *   1. OAuth (Google) → `?code=<oauth code>` — exchange for session.
 *   2. Email magic link → `?token_hash=<hash>&type=<...>` — verifyOtp.
 *
 * On either successful sign-in, transfers ownership of any anonymous
 * chat data to the freshly signed-in user:
 *   - reads the `nx_pre_signin_uid` cookie (set by /api/auth/prepare-signin)
 *   - if the cookie's UID differs from the new user.id, UPDATEs
 *     `chat_sessions` and `rfqs` ownership via the service-role client
 *   - clears the cookie either way
 *
 * Redirects to `?next=<path>` (default `/chat?resume=handoff` so the
 * handoff flow auto-resumes after auth).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/chat?resume=handoff";

  const supabase = await getSupabaseServer();
  let signedIn = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      signedIn = true;
    } else {
      console.error("oauth exchange failed:", error);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
      token_hash: tokenHash,
    });
    if (!error) {
      signedIn = true;
    } else {
      console.error("otp verify failed:", error);
    }
  }

  if (!signedIn) {
    // Always clear the pre-signin cookie even on failure so a stale
    // value doesn't haunt the next attempt.
    (await cookies()).delete(PRE_SIGNIN_COOKIE);
    return NextResponse.redirect(new URL("/chat?auth_error=1", url.origin));
  }

  // Anon → permanent promotion (or plain sign-in). PostHogIdentify ties the
  // browser session to this same user id on the post-redirect page load.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    captureServer(user.id, "auth_completed", {
      method: code ? "google_oauth" : "magic_link",
    });
  }

  await migrateAnonOwnership();
  return NextResponse.redirect(new URL(next, url.origin));
}

/**
 * If the pre-signin cookie is present AND points at a different UID
 * than the freshly signed-in user, move that UID's chat_sessions /
 * rfqs over to the new user. Service-role client to bypass RLS.
 *
 * Non-fatal: migration errors are logged but don't block sign-in. The
 * user lands signed in either way; worst case is the orphan anon
 * session sits unreachable (pg_cron cleans it up in 30 days).
 */
async function migrateAnonOwnership(): Promise<void> {
  const cookieStore = await cookies();
  const prevUid = cookieStore.get(PRE_SIGNIN_COOKIE)?.value;
  cookieStore.delete(PRE_SIGNIN_COOKIE);
  if (!prevUid) return;

  // Re-read the user via the now-updated session cookies.
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn("post-signin user lookup returned null — skipping migration");
    return;
  }
  if (user.id === prevUid) {
    // Same UID (linkIdentity-style upgrade). Nothing to move.
    return;
  }

  const admin = getSupabaseAdmin();
  try {
    await transferSessionsOwnership(admin, prevUid, user.id);
  } catch (e) {
    console.error("chat_sessions migration failed:", e);
  }
  try {
    await transferRfqsOwnership(admin, prevUid, user.id);
  } catch (e) {
    console.error("rfqs migration failed:", e);
  }
}
