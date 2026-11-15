"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useAuthUser } from "@/lib/useAuthUser";
import { cn } from "@/lib/utils";
import { useAuthModal } from "./useAuthModal";

interface LoginTriggerProps {
  className?: string;
  // Render as a primary button of this size. Resolved here because
  // buttonVariants lives in a client module and can't be called from a
  // server component.
  buttonSize?: "sm" | "md" | "lg";
  // Label for a signed-out visitor ("Log in").
  children: ReactNode;
  // Label once signed in, when the same control becomes a link into the
  // account. Defaults to `children`.
  signedInLabel?: ReactNode;
}

/**
 * The marketing site's "Log in" entry point. Signed-out (or anonymous)
 * visitors get the sign-in modal with plain login copy and land on /chat
 * afterwards; signed-in buyers get a link straight to /chat, where their
 * briefs and conversations live.
 */
export function LoginTrigger({
  className: classNameProp,
  buttonSize,
  children,
  signedInLabel,
}: LoginTriggerProps) {
  const { isSignedIn } = useAuthUser();
  const className = cn(
    buttonSize && buttonVariants({ size: buttonSize }),
    classNameProp,
  );
  const { openModal, preload, modal } = useAuthModal({
    redirectTo: "/chat",
    title: "Log in to your account",
    description:
      "Use Google or a one-time email link. Your briefs, conversations and order documents are kept in your account.",
  });

  if (isSignedIn) {
    return (
      <Link href="/chat" className={className}>
        {signedInLabel ?? children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        onPointerEnter={preload}
        onFocus={preload}
        className={className}
      >
        {children}
      </button>
      {modal}
    </>
  );
}
