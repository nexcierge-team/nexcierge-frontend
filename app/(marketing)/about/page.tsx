import Link from "next/link";
import {
  ShieldCheck,
  Users,
  FileSearch,
  Workflow,
  Lock,
  Globe2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/Reveal";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Trust-first sourcing",
    description:
      "Every supplier on Nexcierge is verified by our local team. We check business registries, factory operations, and historical export performance before any quote is shared.",
  },
  {
    icon: Workflow,
    title: "AI + human workflow",
    description:
      "The AI agent qualifies requirements at the speed of conversation. Our local Chinese coordination team takes over for the steps that demand judgment and on-the-ground presence.",
  },
  {
    icon: FileSearch,
    title: "Procurement transparency",
    description:
      "Direct domestic Chinese pricing: no broker markup, no hidden margins. You see the cost breakdown, lead times, and quality assurance steps for every shortlisted supplier.",
  },
  {
    icon: Lock,
    title: "Data discipline",
    description:
      "Buyer requirements stay on our platform. We never broker direct buyer-to-seller contact, which protects pricing, IP, and your sourcing leverage.",
  },
];

const VERIFICATION_STEPS = [
  {
    title: "Business registry check",
    detail:
      "Cross-reference business registration number, legal representative, registered capital, and operating status against official Chinese corporate databases (Qichacha, Tianyancha).",
  },
  {
    title: "Factory verification",
    detail:
      "Confirm physical address, production capacity, and machinery via desktop research and on-site visits where the buyer's value warrants it.",
  },
  {
    title: "Export performance review",
    detail:
      "Check historical export data, certifications (CE, ISO, UL where relevant), and references from prior international buyers in the same vertical.",
  },
  {
    title: "Sample and pre-shipment QA",
    detail:
      "Coordinate sample inspections and pre-shipment quality assurance through our local team or audited third-party inspectors.",
  },
];

// Shared type scales (mirroring the landing sheet's h1 / h2 / lead).
const H1 =
  "type-display text-[length:clamp(2.2rem,1.3rem+3.4vw,3.7rem)] font-extrabold leading-[0.98]";
const H2 =
  "type-display max-w-[21ch] text-[length:clamp(1.75rem,1.1rem+2.7vw,3.2rem)] font-extrabold leading-[1.03]";
const LEAD =
  "max-w-[58ch] text-[length:clamp(1.05rem,0.98rem+0.35vw,1.25rem)] leading-normal";
const SECTION_Y = "py-[clamp(60px,8vw,108px)]";

export default function AboutPage() {
  return (
    <>
      <main>
        {/* Hero */}
        <section className="bg-drafting pt-[calc(var(--nav-h)+clamp(28px,5vw,64px))] pb-[clamp(40px,6vw,72px)]">
          <div className="wrap">
            <Reveal>
              <div className="type-data inline-flex items-center gap-2 rounded-[2px] border-[1.5px] border-ink bg-sheet px-2 py-1 text-[13px] font-bold text-ink">
                <Globe2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                About Nexcierge
              </div>
              <h1 className={`${H1} mt-6 text-ink`}>
                Sourcing built on verification,
                <br className="hidden sm:block" />
                not promises.
              </h1>
              <p className={`${LEAD} mt-6 text-ink-soft`}>
                Industrial machinery procurement involves seven-figure
                decisions made between parties who&apos;ve never met. Nexcierge
                exists to close that trust gap with verified suppliers, a
                managed workflow, and AI-assisted requirement qualification.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Pillars */}
        <section className={`relative ${SECTION_Y}`}>
          <span className="sheet-rule" aria-hidden />
          <div className="wrap">
            <div className="grid gap-px border-[1.5px] border-ink bg-rule-strong md:grid-cols-2">
              {PILLARS.map((p, i) => (
                // The sheet fill sits outside <Reveal>, so the grid's rule
                // colour never shows through a cell that hasn't faded in.
                <div key={p.title} className="bg-sheet">
                <Reveal delay={i * 0.05}>
                  <div className="flex h-full flex-col gap-3 p-8">
                    <p.icon className="h-6 w-6 text-ink" strokeWidth={1.5} />
                    <h3 className="type-title mt-2 text-xl font-bold leading-tight text-ink">
                      {p.title}
                    </h3>
                    <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
                      {p.description}
                    </p>
                  </div>
                </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verification process */}
        <section className={`relative ${SECTION_Y}`}>
          <span className="sheet-rule" aria-hidden />
          <div className="wrap grid gap-[clamp(28px,5vw,64px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
            <Reveal>
              <div className="type-data text-sm font-semibold text-ink-soft">
                Verification
              </div>
              <h2 className={`${H2} mt-3 text-ink`}>
                How supplier verification works.
              </h2>
              <p className={`${LEAD} mt-5 text-ink-soft`}>
                Verification scales with deal value. Lower-stakes inquiries
                receive desktop checks. Higher-stakes ones receive full on-site
                audits before suppliers are introduced to the buyer.
              </p>
            </Reveal>

            <ol className="border-t border-rule-strong">
              {VERIFICATION_STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.05}>
                  <div className="flex gap-5 border-b border-rule-strong py-6">
                    <div className="type-title flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-base font-extrabold tabular-nums text-sheet">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="type-title text-lg font-bold leading-tight text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Team principle */}
        <section className={`bg-cyanotype text-white ${SECTION_Y}`}>
          <div className="wrap">
            <Reveal>
              <Users className="h-7 w-7 text-paint" strokeWidth={1.5} />
              <h2 className={`${H2} mt-5`}>
                People who do this for a living.
              </h2>
              <p className={`${LEAD} mt-5 text-white/80`}>
                Our coordination team has experience across packaging, plastic,
                metalworking, food processing, and textile machinery
                procurement. They speak the language and have walked the
                factory floors. That&apos;s the part you can&apos;t automate.
              </p>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section
          className={`border-t-[1.5px] border-ink bg-sheet ${SECTION_Y}`}
        >
          <div className="wrap">
            <Reveal>
              <h2 className={`${H2} text-ink`}>Have a sourcing requirement?</h2>
              <p className={`${LEAD} mt-5 text-ink-soft`}>
                Start a conversation with the AI sourcing concierge. The first
                qualifying step takes about two minutes.
              </p>
              <div className="mt-8">
                <Button asChild size="lg">
                  <Link href="/chat">
                    Start sourcing
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
