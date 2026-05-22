import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Stash the current anonymous user_id in an HTTP-only cookie before
 * the browser kicks off an OAuth / magic-link flow. The `/auth/callback`
 * route reads this cookie post-sign-in and transfers chat ownership
 * from the anon user to the new permanent user.
 *
 * No-op if the caller is null or already permanent — they don't have
 * anonymous data worth migrating.
 *
 * Security: the cookie's value comes from the server's own validated
 * Supabase session, not from the request body. A malicious caller
 * cannot supply someone else's UID. HTTP-only + sameSite=lax + short
 * TTL keeps the blast radius small.
 */
export async function POST() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.is_anonymous) {
    const cookieStore = await cookies();
    cookieStore.set("nx_pre_signin_uid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes — long enough for email verification
      path: "/",
    });
  }

  return NextResponse.json({ ok: true });
}
