"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  // Path the user lands on after sign-in. Defaults to the current chat
  // page with a resume flag so the interrupted handoff click auto-fires.
  redirectTo?: string;
  // Heading + supporting copy. Defaults to the handoff context ("save your
  // sourcing request"); the guest signup gate passes its own message-limit
  // copy. The auth flows themselves (Google / magic link) are identical.
  title?: string;
  description?: string;
}

type FlowState =
  | { kind: "idle" }
  | { kind: "loading"; provider: "google" | "email" }
  | { kind: "magic_link_sent"; email: string }
  | { kind: "error"; message: string };

/**
 * Sign-in modal. Triggered when /api/request-review returns 401 with
 * `auth_required: true`. Two paths, both passwordless:
 *
 *  1. Continue with Google — supabase.auth.linkIdentity({provider: 'google'})
 *     upgrades the anonymous user in place. After OAuth, the redirect
 *     lands on /auth/callback?code=... which exchanges for the session
 *     and bounces to /chat?resume=handoff.
 *
 *  2. Continue with email magic link — supabase.auth.updateUser({email})
 *     sends a confirmation email to the anonymous user. Clicking the
 *     link verifies and converts to a permanent user, redirecting to
 *     /chat?resume=handoff via the Supabase project's Site URL config.
 *
 * In both cases the auth.users.id is preserved, so chat_sessions and
 * rfqs ownership stays intact — no merge migration needed.
 */
export function AuthModal({
  open,
  onClose,
  redirectTo,
  title = "Save your sourcing request",
  description = "Create your free Nexcierge account to send this brief to our account manager and keep track of progress.",
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [flow, setFlow] = useState<FlowState>({ kind: "idle" });
  // Track mount so createPortal isn't called during SSR (document is
  // undefined server-side). After hydration, mounted flips true and we
  // start portalling.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while the modal is open. Without this, scrolling
  // the page behind the overlay looks broken.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function defaultRedirect(): string {
    if (typeof window === "undefined") return "/chat?resume=handoff";
    return redirectTo
      ? new URL(redirectTo, window.location.origin).toString()
      : `${window.location.origin}/chat?resume=handoff`;
  }

  async function signInWithGoogle() {
    setFlow({ kind: "loading", provider: "google" });
    try {
      // Stash the current anon user_id server-side BEFORE the redirect
      // so /auth/callback can transfer any anon chat data to the new
      // permanent user after sign-in completes. No-op when there's no
      // anon session.
      await fetch("/api/auth/prepare-signin", { method: "POST" });

      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            defaultRedirect().replace(window.location.origin, ""),
          )}`,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error("google sign-in failed:", e);
      setFlow({
        kind: "error",
        message: "Couldn't start Google sign-in. Please try again.",
      });
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setFlow({ kind: "loading", provider: "email" });
    try {
      await fetch("/api/auth/prepare-signin", { method: "POST" });

      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            defaultRedirect().replace(window.location.origin, ""),
          )}`,
        },
      });
      if (error) throw error;
      setFlow({ kind: "magic_link_sent", email: trimmed });
    } catch (e) {
      console.error("magic link send failed:", e);
      setFlow({
        kind: "error",
        message:
          "Couldn't send the magic link. Please check the email address and try again.",
      });
    }
  }

  const isLoading = flow.kind === "loading";

  // Don't try to portal until we've mounted client-side (avoids SSR
  // mismatch and `document is not defined` errors during pre-render).
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 pt-safe pb-safe pl-safe pr-safe backdrop-blur-sm"
          onClick={isLoading ? undefined : onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)]"
          >
            <button
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="px-6 pt-7 pb-6">
              <h2
                id="auth-modal-title"
                className="text-lg font-semibold tracking-[-0.01em] text-gray-900"
              >
                {title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                {description}
              </p>

              {flow.kind === "magic_link_sent" ? (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                      strokeWidth={2}
                    />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">
                        Check your email
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                        We sent a sign-in link to <strong>{flow.email}</strong>.
                        Open it from this device to finish.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-6 w-full"
                    onClick={signInWithGoogle}
                    disabled={isLoading}
                  >
                    {flow.kind === "loading" && flow.provider === "google" ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        strokeWidth={2}
                      />
                    ) : (
                      <GoogleGlyph />
                    )}
                    Continue with Google
                  </Button>

                  <div className="my-5 flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    OR
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>

                  <form onSubmit={sendMagicLink} className="space-y-3">
                    <label className="block">
                      <span className="sr-only">Email</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        disabled={isLoading}
                        className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0F2747] focus:outline-none focus:ring-2 focus:ring-[#0F2747]/15 disabled:opacity-50"
                      />
                    </label>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={isLoading || !email.trim()}
                    >
                      {flow.kind === "loading" && flow.provider === "email" ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          strokeWidth={2}
                        />
                      ) : (
                        <Mail className="h-4 w-4" strokeWidth={1.75} />
                      )}
                      Email me a sign-in link
                    </Button>
                  </form>
                </>
              )}

              {flow.kind === "error" && (
                <p className="mt-4 text-xs text-red-700">{flow.message}</p>
              )}

              <p className="mt-6 text-[11px] leading-relaxed text-gray-400">
                By continuing, you agree to Nexcierge&apos;s terms. No password
                required — we use one-tap and email links.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}


function GoogleGlyph() {
  // Minimal inline Google "G" glyph so we don't pull in a separate asset.
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.614z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
