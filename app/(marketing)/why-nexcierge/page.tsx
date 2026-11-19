import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoginTrigger } from "@/components/auth/LoginTrigger";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { InView } from "@/components/landing/InView";
import { MorFlow } from "@/components/landing/MorFlow";
import { OrderHistory } from "@/components/landing/OrderHistory";
import { PageHero } from "@/components/landing/PageHero";
import { BODY, H2, H3, LEAD, SECTION } from "@/components/landing/styles";
import { WHY } from "@/lib/landingContent";

export const metadata: Metadata = {
  title: "Why Nexcierge | Nexcierge",
  description:
    "Nexcierge is the company you buy from: we purchase the equipment from the manufacturer and sell it to you, under one contract with one company accountable.",
};

export default function WhyNexciergePage() {
  return (
    <main className="overflow-x-clip">
      <PageHero title={WHY.title} lead={WHY.lead} />

      {/* 1. The seller model, on the one dark section of the page. */}
      <section
        aria-labelledby="seller-title"
        className={`bg-navy-grid text-white ${SECTION}`}
      >
        <div className="wrap grid gap-[clamp(40px,5vw,72px)] min-[1060px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] min-[1060px]:items-center">
          <div className="grid gap-5">
            <h2 id="seller-title" className={`${H2} text-white`}>
              {WHY.seller.title}
            </h2>
            {WHY.seller.text.map((p) => (
              <p key={p} className="max-w-[54ch] text-[clamp(1.0625rem,1rem+0.3vw,1.1875rem)] leading-[1.6] text-white/80">
                {p}
              </p>
            ))}
          </div>
          <div className="grid gap-6">
            <MorFlow tone="dark" showFlows />
            <p className="max-w-[60ch] border-l-2 border-paint pl-4 text-[15px] leading-[1.6] text-white/80">
              {WHY.seller.plain}
            </p>
          </div>
        </div>
      </section>

      {/* 2 to 4. Three short commitments as an editorial list. */}
      <section aria-label="How we work" className={SECTION}>
        <ul className="wrap">
          {WHY.points.map((point) => (
            <InView
              key={point.title}
              kind="reveal"
              as="li"
              className="grid gap-x-[clamp(28px,5vw,96px)] gap-y-3 border-t border-rule-strong py-[clamp(28px,4vw,48px)] last:border-b min-[760px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
            >
              <h2 className={`${H3} text-[clamp(1.375rem,1.2rem+0.7vw,1.75rem)]`}>
                {point.title}
              </h2>
              <div className="grid content-start gap-3">
                <p className={`${BODY} text-[17px]`}>{point.text}</p>
                {"note" in point && (
                  <p className="text-[15px] leading-[1.6] text-ink-soft">{point.note}</p>
                )}
              </div>
            </InView>
          ))}
        </ul>
      </section>

      {/* 5. The buyer account. */}
      <section aria-labelledby="account-title" className={`${SECTION} bg-paper`}>
        <div className="wrap grid gap-[clamp(32px,5vw,72px)] min-[960px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] min-[960px]:items-start">
          <div className="grid justify-items-start gap-5">
            <h2 id="account-title" className={H2}>
              {WHY.account.title}
            </h2>
            <p className={LEAD}>{WHY.account.text}</p>
            <LoginTrigger
              buttonSize="lg"
              className="mt-2 max-[479px]:w-full"
              signedInLabel={WHY.account.signedInCta}
            >
              {WHY.account.cta}
            </LoginTrigger>
          </div>
          <OrderHistory />
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className={SECTION}>
        <div className="wrap grid gap-[clamp(28px,5vw,72px)] min-[960px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] min-[960px]:items-start">
          <h2 id="faq-title" className={H2}>
            {WHY.faqTitle}
          </h2>
          <Accordion type="single" collapsible className="w-full border-t border-rule-strong">
            {WHY.faq.map((f, i) => (
              <AccordionItem key={f.question} value={`q-${i}`}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <ClosingCTA placement="why-closing" />
    </main>
  );
}
