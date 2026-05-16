import Image from "next/image";
import { Check } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";

const BULLETS = [
  {
    title: "Direct from the factory floor",
    body:
      "We bypass agents and trade-fair markups by sourcing from manufacturers on the Chinese domestic market.",
  },
  {
    title: "Verified before introduction",
    body:
      "Every supplier goes through a registry check and operational verification before any quote reaches you.",
  },
  {
    title: "Negotiated by people who speak the language",
    body:
      "Our local team manages the conversation, the quote, and the quality assurance steps.",
  },
];

export function DirectSourcing() {
  return (
    <section className="border-b border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
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
                description="The fastest path between a global buyer and a Chinese manufacturer runs through a managed, AI-assisted workflow — not a brokered relay race."
              />

              <ul className="mt-10 space-y-6">
                {BULLETS.map((b) => (
                  <li key={b.title} className="flex gap-4">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DCE8F8]">
                      <Check
                        className="h-3 w-3 text-[#0F2747]"
                        strokeWidth={2.5}
                      />
                    </span>
                    <div>
                      <div className="text-base font-semibold text-gray-900">
                        {b.title}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        {b.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
