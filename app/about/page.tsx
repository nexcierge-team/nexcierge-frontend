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
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
      "Direct domestic Chinese pricing — no broker markup, no hidden margins. You see the cost breakdown, lead times, and quality assurance steps for every shortlisted supplier.",
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

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="border-b border-zinc-200/70 bg-white">
          <div className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center sm:pt-28">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                <Globe2 className="h-3.5 w-3.5 text-[#0066cc]" strokeWidth={1.5} />
                About Nexcierge
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.02em] text-zinc-900 sm:text-5xl">
                Sourcing built on verification,
                <br className="hidden sm:block" />
                not promises.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
                Industrial machinery procurement involves seven-figure
                decisions made between parties who&apos;ve never met. Nexcierge
                exists to close that trust gap with verified suppliers, a
                managed workflow, and AI-assisted requirement qualification.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Pillars */}
        <section className="border-b border-zinc-200/70 bg-[#fbfbfd]">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 md:grid-cols-2">
              {PILLARS.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.05}>
                  <div className="flex h-full flex-col gap-3 bg-white p-8">
                    <p.icon
                      className="h-5 w-5 text-[#0066cc]"
                      strokeWidth={1.5}
                    />
                    <h3 className="mt-2 text-lg font-semibold text-zinc-900">
                      {p.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-600">
                      {p.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Verification process */}
        <section className="border-b border-zinc-200/70 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-24 sm:py-28">
            <Reveal>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#0066cc]">
                Verification
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] text-zinc-900 sm:text-4xl">
                How supplier verification works.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
                Verification scales with deal value. Lower-stakes inquiries
                receive desktop checks. Higher-stakes ones receive full on-site
                audits before suppliers are introduced to the buyer.
              </p>
            </Reveal>

            <ol className="mt-14 space-y-10">
              {VERIFICATION_STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.05}>
                  <div className="flex gap-6">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-medium text-zinc-700">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
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
        <section className="border-b border-zinc-200/70 bg-[#fbfbfd]">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-28">
            <Reveal>
              <Users className="mx-auto h-6 w-6 text-zinc-400" strokeWidth={1.5} />
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.015em] text-zinc-900 sm:text-4xl">
                People who do this for a living.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
                Our coordination team has experience across packaging, plastic,
                metalworking, food processing, and textile machinery
                procurement. They speak the language and have walked the
                factory floors — that&apos;s the part you can&apos;t automate.
              </p>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-28">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-[-0.015em] text-zinc-900 sm:text-4xl">
                Have a sourcing requirement?
              </h2>
              <p className="mt-5 text-base text-zinc-600 sm:text-lg">
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
      <Footer />
    </>
  );
}
