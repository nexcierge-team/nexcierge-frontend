import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentConsole } from "@/components/landing/AgentConsole";
import { ArrowLink } from "@/components/landing/ArrowLink";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { InView } from "@/components/landing/InView";
import { PageHero } from "@/components/landing/PageHero";
import { BODY, H2, H3, LABEL, LEAD, SECTION } from "@/components/landing/styles";
import { AGENT, CTA, HOW } from "@/lib/landingContent";

export const metadata: Metadata = {
  title: "How it works | Nexcierge",
  description:
    "From your first request to the right equipment: how Nexcierge prepares your sourcing brief, finds and checks manufacturers, and sells you the machine under one contract.",
};

export default function HowItWorksPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero title={HOW.title} lead={HOW.lead}>
        <Button asChild size="lg" className="max-[479px]:w-full">
          <Link href="/chat" data-ph-capture-attribute-cta="how-hero">
            {CTA.start}
          </Link>
        </Button>
        <ArrowLink href="#assistant">See the sourcing assistant</ArrowLink>
      </PageHero>

      <section aria-labelledby="process-title" className={SECTION}>
        <div className="wrap grid gap-[clamp(40px,6vw,96px)] min-[1060px]:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <div className="grid content-start gap-5 min-[1060px]:sticky min-[1060px]:top-[calc(var(--nav-h)+32px)] min-[1060px]:self-start">
            <h2 id="process-title" className={H2}>
              {HOW.processTitle}
            </h2>
            <p className={LEAD}>{HOW.processLead}</p>
          </div>

          {/* A vertical timeline: each stage draws the spine down to the
              next number, so the line starts and ends on a stage. */}
          <ol className="grid">
            {HOW.stages.map((stage, i) => (
              <InView
                key={stage.title}
                kind="reveal"
                as="li"
                delay={Math.min(i, 2) * 0.06}
                className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-x-5 py-6 after:absolute after:-bottom-6 after:left-[19.5px] after:top-16 after:w-px after:bg-rule-strong last:after:hidden min-[640px]:gap-x-7"
              >
                <span className="type-data relative grid h-10 w-10 place-items-center rounded-full border border-ink bg-sheet text-sm font-semibold text-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="grid content-start gap-2 pt-1.5">
                  <h3 className={H3}>{stage.title}</h3>
                  <p className={BODY}>{stage.text}</p>
                  <p className={LABEL}>
                    <span className="sr-only">Handled by: </span>
                    {stage.who}
                  </p>
                </div>
              </InView>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="assistant"
        aria-labelledby="assistant-title"
        className={`${SECTION} scroll-mt-[var(--nav-h)] bg-paper`}
      >
        <div className="wrap grid gap-[clamp(32px,5vw,72px)] min-[1060px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] min-[1060px]:items-start">
          <div className="grid gap-5">
            <h2 id="assistant-title" className={H2}>
              {AGENT.title}
            </h2>
            <p className={LEAD}>{AGENT.lead}</p>
            <p className="max-w-[48ch] text-[15px] leading-[1.6] text-ink-soft">
              {AGENT.note}
            </p>
          </div>
          <AgentConsole />
        </div>
      </section>

      <ClosingCTA
        placement="how-closing"
        secondary={{ href: "/why-nexcierge", label: "Why buyers choose Nexcierge" }}
      />
    </main>
  );
}
