"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "./AuthModal";
import { useAuthUser } from "@/lib/useAuthUser";
import { cn } from "@/lib/utils";

interface AccountMenuProps {
  // Where to redirect after a fresh sign-in. Defaults to the current
  // pathname so the header keeps the user where they were.
  redirectTo?: string;
  // Visual variant:
  //   "button"  — pill button suitable for a marketing header
  //   "compact" — flat row suitable for a sidebar footer
  variant?: "button" | "compact";
}

export function AccountMenu({
  redirectTo,
  variant = "button",
}: AccountMenuProps) {
  const { user, loading, isAnonymous, isSignedIn, signOut } = useAuthUser();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  }

  if (loading) {
    return variant === "compact" ? (
      <div className="text-xs text-gray-400">…</div>
    ) : (
      <div className="h-9 w-20 animate-pulse rounded-full bg-gray-100" />
    );
  }

  // Not signed in (or still anonymous) → Sign in CTA.
  if (!isSignedIn) {
    if (variant === "compact") {
      return (
        <>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="text-xs font-medium text-[#0F2747] hover:underline"
          >
            Sign in
          </button>
          <AuthModal
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            redirectTo={redirectTo}
          />
        </>
      );
    }
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setAuthModalOpen(true)}
        >
          Sign in
        </Button>
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          redirectTo={redirectTo}
        />
      </>
    );
  }

  // Signed in (non-anonymous) → email + dropdown with sign out.
  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={cn(
          "inline-flex items-center gap-2 transition-colors",
          variant === "button"
            ? "h-9 rounded-full border border-gray-200 bg-white px-3 hover:border-gray-300 hover:bg-gray-50"
            : "text-xs text-gray-700 hover:text-gray-900",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-[#0F2747] text-white",
            variant === "button" ? "h-6 w-6 text-[11px]" : "h-5 w-5 text-[10px]",
          )}
          aria-hidden="true"
        >
          {initial}
        </span>
        <span
          className={cn(
            "max-w-[14ch] truncate",
            variant === "button"
              ? "text-sm font-medium text-gray-900"
              : "text-xs text-gray-800",
          )}
        >
          {email}
        </span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)]",
            variant === "button" ? "right-0" : "left-0 bottom-full mb-1.5",
          )}
        >
          {isAnonymous ? null : (
            <div className="border-b border-gray-100 px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                Signed in
              </div>
              <div className="truncate text-xs text-gray-800">{email}</div>
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}


// Small read-only label for places that just want to surface identity
// without a dropdown (e.g. tight sidebar footers).
export function AccountChip() {
  const { user, isAnonymous, loading } = useAuthUser();
  if (loading) return <span className="text-xs text-gray-400">…</span>;
  if (!user || isAnonymous) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
        <UserRound className="h-3.5 w-3.5" strokeWidth={1.5} />
        Guest
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
      <UserRound className="h-3.5 w-3.5" strokeWidth={1.5} />
      <span className="max-w-[18ch] truncate">{user.email}</span>
    </span>
  );
}
