"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { QUICK_CATEGORIES } from "@/lib/mockData";

export function HeroChatPreview() {
  const router = useRouter();

  // Navigates to the full chat page. `new=1` forces a fresh chat_session
  // (rather than resuming the prior conversation) and `seed` auto-sends the
  // picked category as the first message — same pattern as Categories.tsx.
  function openWith(message?: string) {
    const seed = message ? `&seed=${encodeURIComponent(message)}` : "";
    router.push(`/chat?new=1${seed}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-md lg:max-w-lg"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-12 -z-10 rounded-[3rem] bg-gradient-to-br from-[#DCE8F8] via-white to-transparent opacity-90 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.75rem] bg-gradient-to-b from-[#0F2747]/10 to-transparent blur-2xl"
      />

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        role="button"
        tabIndex={0}
        aria-label="Open the sourcing concierge chat"
        onClick={() => openWith()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openWith();
          }
        }}
        className="group block w-full cursor-pointer overflow-hidden rounded-3xl border border-gray-200 bg-white text-left shadow-[0_40px_120px_-32px_rgba(15,39,71,0.35)] ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-[0_48px_140px_-32px_rgba(15,39,71,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2747] focus-visible:ring-offset-2"
      >
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          </div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Nexcierge agent
          </div>
        </div>

        {/* Mock conversation */}
        <div className="space-y-3 px-5 py-5">
          <Bubble role="user" delay={0.4}>
            I need a PET bottle blowing machine for 1500 bottles/hour.
          </Bubble>
          <Bubble role="agent" delay={0.9}>
            Got it. Do you need automatic or semi-automatic?
          </Bubble>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            className="flex flex-wrap gap-1.5 pt-1"
          >
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={(e) => {
                  e.stopPropagation();
                  openWith(`I'm looking for ${cat.toLowerCase()}.`);
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                {cat}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Composer mock — clicking acts like clicking the card */}
        <div className="border-t border-gray-100 p-3">
          <div className="relative">
            <div className="w-full rounded-2xl bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-400">
              Tell me more about your requirements…
            </div>
            <div
              aria-hidden
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-gray-900 text-white"
            >
              <ArrowUp className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Hover hint */}
        <div className="border-t border-gray-100 bg-[#F7F8FA] px-5 py-2.5 text-center text-[11px] text-gray-500 transition-colors group-hover:bg-white group-hover:text-gray-700">
          Click anywhere to start chatting
        </div>
      </motion.div>
    </motion.div>
  );
}

function Bubble({
  role,
  delay,
  children,
}: {
  role: "user" | "agent";
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          role === "user"
            ? "bg-[#0F2747] text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}
