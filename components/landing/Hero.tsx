import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HERO } from "@/lib/landingContent";
import { HeroRig } from "./rig/HeroRig";
import { H1, LEAD } from "./styles";

// Sheet 1. The headline is plotted in with a pure-CSS clip (`plot-now`)
// and the rest staggers in with `hero-in`, so the server-rendered copy is
// never waiting on hydration. The 3D rig is a lazy client island.
export function Hero() {
  return (
    <header
      id="top"
      className="bg-drafting relative pb-[clamp(40px,6vw,72px)] pt-[calc(var(--nav-h)+clamp(28px,5vw,64px))]"
    >
      <div className="wrap grid items-center gap-[clamp(24px,4vw,48px)] min-[960px]:grid-cols-[minmax(0,5.6fr)_minmax(0,6.4fr)]">
        <div className="relative z-[2] grid gap-[22px]">
          <h1 className={cn(H1, "plot-now")}>{HERO.title}</h1>
          <p className={cn(LEAD, "hero-in")} style={{ animationDelay: "0.7s" }}>
            {HERO.lead}
          </p>
          <div
            className="hero-in flex flex-wrap gap-3"
            style={{ animationDelay: "0.8s" }}
          >
            <Button asChild size="lg">
              <Link href="/chat" data-ph-capture-attribute-cta="hero">
                Start a brief
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/#process">See how it works</Link>
            </Button>
          </div>
          <p
            className="hero-in max-w-[52ch] text-[13px] text-ink-soft"
            style={{ animationDelay: "0.9s" }}
          >
            {HERO.caption}
          </p>
        </div>
        <HeroRig />
      </div>

      <div className="wrap">
        <dl className="mt-[clamp(28px,4vw,48px)] grid grid-cols-2 border border-ink bg-sheet min-[960px]:grid-cols-4">
          {HERO.ledger.map((cell, i) => (
            <div
              key={cell.term}
              className={cn(
                "hero-in border-rule-strong px-4 py-3.5",
                i === 0 && "border-b border-r min-[960px]:border-b-0",
                i === 1 && "border-b min-[960px]:border-b-0 min-[960px]:border-r",
                i === 2 && "border-r",
              )}
              style={{ animationDelay: `${1.1 + i * 0.08}s`, ["--hero-dy" as string]: "0px" }}
            >
              <dt className="type-data text-[13px] font-semibold text-ink-soft">
                {cell.term}
              </dt>
              <dd className="mt-0.5 font-bold leading-tight [font-stretch:108%]">
                {cell.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
