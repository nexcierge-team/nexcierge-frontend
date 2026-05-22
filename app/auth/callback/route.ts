import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Supabase auth callback. Handles two paths:
 *
 * 1. OAuth (Google) → `?code=<oauth code>` — exchange for session.
 * 2. Email link verification → `?token_hash=<hash>&type=<email|magiclink|signup|recovery|email_change>`
 *    — verify the OTP, which upgrades the anonymous user to a permanent
 *    one (and resolves email change confirmations).
 *
 * After success, redirect to `?next=<path>` (default `/chat?resume=handoff`)
 * so the chat page can auto-resume the interrupted handoff click.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/chat?resume=handoff";

  const supabase = await getSupabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("oauth exchange failed:", error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("otp verify failed:", error);
  }

  // Anything else: bounce back to /chat with an error flag the page can
  // surface as a banner.
  return NextResponse.redirect(new URL("/chat?auth_error=1", url.origin));
}
