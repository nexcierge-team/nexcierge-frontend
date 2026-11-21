import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CTA, HERO } from "@/lib/landingContent";
import { ArrowLink } from "./ArrowLink";
import { HeroRig } from "./rig/HeroRig";
import { H1, LEAD } from "./styles";

// Homepage section 1. Copy fades in with pure CSS (`hero-in`), so the
// server-rendered text never waits on hydration. The machine drawing is a
// lazy client island over a faint drafting grid. The section is sticky;
// see app/(marketing)/page.tsx.
export function Hero() {
  return (
    <section
      data-hero
      aria-labelledby="hero-title"
      // Sticky. `top` is set by HeroRig: 0 when the hero fits the
      // viewport, otherwise negative, so it pins only once its bottom (the
      // drawing, on phones) is on screen.
      className="bg-drafting sticky top-0 z-0 pb-[var(--section-y)] pt-[calc(var(--nav-h)+clamp(32px,6vw,80px))]"
    >
      <div className="wrap grid items-center gap-[clamp(32px,4vw,56px)] min-[960px]:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <div className="relative z-[2] grid justify-items-start gap-6">
          <h1 id="hero-title" className={cn(H1, "hero-in")}>
            {HERO.title}
          </h1>
          <p className={cn(LEAD, "hero-in max-w-[46ch]")} style={{ animationDelay: "0.12s" }}>
            {HERO.lead}
          </p>
          <div
            className="hero-in mt-2 flex w-full flex-wrap items-center gap-x-7 gap-y-3"
            style={{ animationDelay: "0.2s" }}
          >
            <Button asChild size="lg" className="max-[479px]:w-full">
              <Link href="/chat" data-ph-capture-attribute-cta="hero">
                {CTA.start}
              </Link>
            </Button>
            <ArrowLink href="/how-it-works" cta="hero-secondary">
              {CTA.howItWorks}
            </ArrowLink>
          </div>
        </div>
        <HeroRig />
      </div>
    </section>
  );
}
