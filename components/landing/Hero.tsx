"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroChatPreview } from "./HeroChatPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/70">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pt-20 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pt-28 lg:pb-32">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#0066cc]" />
            AI sourcing concierge · now in private preview
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.02em] text-zinc-900 sm:text-5xl lg:text-[3.5rem]"
          >
            Source industrial machinery
            <br className="hidden sm:block" />
            <span className="text-zinc-500"> from China</span>
            <span className="text-zinc-900">
              {" "}without brokers, trade fairs, or guesswork.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600"
          >
            Describe what you need. Our AI sourcing concierge helps identify
            suppliers, qualify requirements, and connect you with a managed
            sourcing workflow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg">
              <Link href="/chat">
                Start sourcing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </motion.div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroChatPreview />
        </div>
      </div>
    </section>
  );
}
