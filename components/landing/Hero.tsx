"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroChatPreview } from "./HeroChatPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-200/70">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pt-20 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pt-28 lg:pb-32">
        <div className="max-w-2xl">
          <div
            className="hero-in inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
            style={{ "--hero-dy": "12px", animationDuration: "0.5s" } as CSSProperties}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#0F2747]" />
            AI sourcing concierge · now in private preview
          </div>

          <h1
            className="hero-in mt-6 text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.02em] text-gray-900 sm:text-5xl lg:text-[3.5rem]"
            style={{ "--hero-dy": "16px", animationDelay: "50ms" } as CSSProperties}
          >
            Source machinery
            <br className="hidden sm:block" />
            <span className="text-gray-500"> without</span>
            <span className="text-gray-900"> guesswork.</span>
          </h1>

          <p
            className="hero-in mt-5 max-w-xl text-xl font-medium leading-snug text-gray-800 sm:text-2xl"
            style={{ "--hero-dy": "14px", animationDelay: "100ms" } as CSSProperties}
          >
            From AI consultation to factory-floor validation, we handle every
            step of your procurement.
          </p>

          <p
            className="hero-in mt-6 max-w-xl text-lg leading-relaxed text-gray-600"
            style={{ "--hero-dy": "12px", animationDelay: "150ms" } as CSSProperties}
          >
            Describe what you need. Our AI sourcing concierge helps identify
            suppliers, qualify requirements, and connect you with a managed
            sourcing workflow.
          </p>

          <div
            className="hero-in mt-9 flex flex-wrap items-center gap-3"
            style={{ "--hero-dy": "12px", animationDelay: "250ms" } as CSSProperties}
          >
            <Button asChild variant="secondary" size="lg">
              <Link href="#how-it-works">How it works</Link>
            </Button>
            <p className="text-sm text-gray-500">
              or click the chat to start sourcing →
            </p>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroChatPreview />
        </div>
      </div>
    </section>
  );
}
