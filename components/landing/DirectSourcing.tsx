import Image from "next/image";
import { Brain, FileText, ShieldCheck, Truck } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";

const CARDS = [
  {
    icon: FileText,
    title: "AI-Powered Intake",
    body:
      "Bypass traditional lead forms. Input your exact machinery specs — from voltages to mold geometries — natively through our multilingual AI agent.",
  },
  {
    icon: Brain,
    title: "Siloed Market Matching",
    body:
      "Our system instantly cross-references domestic-only Asian marketplaces to find your match, keeping your corporate identity completely hidden to protect your IP.",
  },
  {
    icon: ShieldCheck,
    title: "The Principal Guarantee",
    body:
      "You transact exclusively with Nexcierge through secure financial gateways. As your Merchant of Record, we take on 100% of the cross-border financial risk.",
  },
  {
    icon: Truck,
    title: "Fulfillment & Installation",
    body:
      "We manage the international export, cross-border freight, and coordinate \"Fly-In\" engineering teams to execute your final on-site installation.",
  },
];

export function DirectSourcing() {
  return (
    <section className="border-b border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <Image
                src="/illustrations/manufacturing-bro.svg"
                alt="Engineer working with industrial machinery"
                width={500}
                height={500}
                className="h-auto w-full"
                priority={false}
              />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div>
              <SectionHeader
                eyebrow="Direct sourcing"
                title="Made directly. Verified locally."
                description="We bypass agents and trade-fair markups by sourcing from manufacturers on the domestic market — a managed, AI-assisted workflow, not a brokered relay race."
              />
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((c) => (
              <div
                key={c.title}
                className="group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:border-gray-300 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCE8F8]">
                  <c.icon
                    className="h-5 w-5 text-[#0F2747]"
                    strokeWidth={1.75}
                  />
                </span>
                <div className="mt-5 text-base font-semibold text-gray-900">
                  {c.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
