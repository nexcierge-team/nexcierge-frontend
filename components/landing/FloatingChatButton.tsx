"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { HeroChatModal } from "./HeroChatModal";

export function FloatingChatButton() {
  const pathname = usePathname() ?? "/";
  // Hide on routes that already surface chat / where a FAB would
  // collide with their own primary UI.
  const hidden =
    pathname.startsWith("/chat") || pathname.startsWith("/dashboard");

  const [open, setOpen] = useState(false);
  // Bumped on every open so the modal remounts and useChat re-fires with
  // forceNew=true — matches the homepage chat preview's behaviour.
  const [seq, setSeq] = useState(0);

  function handleOpen() {
    setSeq((s) => s + 1);
    setOpen(true);
  }

  if (hidden) return null;

  return (
    <>
      <motion.button
        type="button"
        onClick={handleOpen}
        aria-label="Start sourcing"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="group fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2747] text-white shadow-[0_18px_44px_-14px_rgba(15,39,71,0.55)] ring-1 ring-black/[0.04] transition-colors hover:bg-[#1D4ED8] sm:bottom-8 sm:right-8 sm:h-16 sm:w-16"
      >
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl bg-[#1D4ED8] opacity-40 blur-xl transition-opacity group-hover:opacity-60"
        />
        <MessageSquare className="h-6 w-6" strokeWidth={1.75} />
      </motion.button>

      {seq > 0 && (
        <HeroChatModal
          key={seq}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
