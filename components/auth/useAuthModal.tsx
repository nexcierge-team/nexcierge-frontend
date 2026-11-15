"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// The sign-in modal (framer-motion + auth flows) is only needed once a
// visitor asks to sign in, but its triggers render on every marketing
// page. Load it on demand, warm it on hover/focus so the first open is
// still instant, and mount it only after the first open (kept mounted
// afterwards so its exit animation plays).
const AuthModal = dynamic(
  () => import("./AuthModal").then((m) => m.AuthModal),
  { ssr: false },
);

export function preloadAuthModal() {
  void import("./AuthModal");
}

interface UseAuthModalOptions {
  // Where to land after sign-in. Omit for AuthModal's default
  // (/chat?resume=handoff).
  redirectTo?: string;
  // Heading + supporting copy. Omit for the handoff defaults.
  title?: string;
  description?: string;
}

/**
 * One lazy AuthModal instance plus the handlers to open it. Render
 * `modal` somewhere in the caller's tree and wire `openModal` /
 * `preload` to the trigger element.
 */
export function useAuthModal(options: UseAuthModalOptions = {}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const openModal = () => {
    setMounted(true);
    setOpen(true);
  };

  const modal = mounted ? (
    <AuthModal open={open} onClose={() => setOpen(false)} {...options} />
  ) : null;

  return { openModal, preload: preloadAuthModal, modal };
}
