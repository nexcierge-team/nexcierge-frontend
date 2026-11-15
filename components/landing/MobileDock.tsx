"use client";

import Link from "next/link";
import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Phone-only "Start a brief" bar pinned to the bottom edge once the hero
// buttons have scrolled away. The header CTA is hidden at this width.
export function MobileDock() {
  const [on, setOn] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setOn(y > 520));

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-rule-strong bg-paper px-[var(--gutter)] pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] min-[960px]:hidden",
        on ? "translate-y-0" : "translate-y-[110%]",
      )}
      // Off-screen but still in the tab order would trap keyboard users.
      inert={!on}
    >
      <Button asChild size="lg" className="w-full">
        <Link href="/chat" data-ph-capture-attribute-cta="dock">
          Start a brief
        </Link>
      </Button>
    </div>
  );
}
