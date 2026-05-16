"use client";

import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { QUICK_CATEGORIES } from "@/lib/mockData";

export function HeroChatPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-md"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-b from-gray-100 to-transparent opacity-60 blur-2xl"
      />
      <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.18)]">
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
                tabIndex={-1}
                className="cursor-default rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600"
              >
                {cat}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="border-t border-gray-100 p-3">
          <div className="relative">
            <input
              readOnly
              value="Tell me more about your requirements…"
              tabIndex={-1}
              className="w-full cursor-default rounded-2xl bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-400 placeholder:text-gray-400 focus:outline-none"
            />
            <button
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 cursor-default items-center justify-center rounded-full bg-gray-900 text-white"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
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
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}
