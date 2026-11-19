import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { InView } from "@/components/landing/InView";
import { PageHero } from "@/components/landing/PageHero";
import { ScopeSelector } from "@/components/landing/ScopeSelector";
import { BODY, H2, H3, LEAD, SECTION } from "@/components/landing/styles";
import { CTA, SCOPE, SERVICES } from "@/lib/landingContent";

export const metadata: Metadata = {
  title: "Services | Nexcierge",
  description:
    "Equipment sourcing, supplier verification, international shipping, financing and installation support, coordinated by one company under one contract.",
};

export default function ServicesPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero title={SERVICES.title} lead={SERVICES.lead}>
        <Button asChild size="lg" className="max-[479px]:w-full">
          <Link href="/chat" data-ph-capture-attribute-cta="services-hero">
            {CTA.start}
          </Link>
        </Button>
      </PageHero>

      <section aria-label="Services" className="pb-[clamp(64px,9vw,128px)]">
        <ul className="wrap">
          {SERVICES.items.map((s) => (
            <InView
              key={s.id}
              id={s.id}
              kind="reveal"
              as="li"
              className="grid scroll-mt-[calc(var(--nav-h)+24px)] gap-x-[clamp(28px,5vw,96px)] gap-y-2 border-t border-rule-strong py-[clamp(24px,3.5vw,40px)] last:border-b min-[760px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
            >
              <h2 className={H3}>{s.title}</h2>
              <p className={BODY}>{s.text}</p>
            </InView>
          ))}
        </ul>
      </section>

      <section
        id="delivery"
        aria-labelledby="delivery-title"
        className={`${SECTION} scroll-mt-[var(--nav-h)] bg-paper`}
      >
        <div className="wrap">
          <div className="mb-[clamp(32px,5vw,56px)] grid gap-5">
            <h2 id="delivery-title" className={H2}>
              {SCOPE.title}
            </h2>
            <p className={LEAD}>{SCOPE.lead}</p>
          </div>
          <ScopeSelector />
        </div>
      </section>

      <ClosingCTA placement="services-closing" />
    </main>
  );
}
