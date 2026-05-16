import { HOW_IT_WORKS } from "@/lib/mockData";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeader
          eyebrow="How it works"
          title="From requirement to delivery, in five steps."
          description="A managed workflow that combines an AI sourcing agent with a local Chinese coordination team."
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.05}>
              <div className="flex h-full flex-col gap-3 bg-white p-7">
                <div className="text-xs font-medium tracking-[0.18em] text-gray-400">
                  {s.step}
                </div>
                <div className="text-base font-semibold text-gray-900">
                  {s.title}
                </div>
                <p className="text-sm leading-relaxed text-gray-600">
                  {s.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
