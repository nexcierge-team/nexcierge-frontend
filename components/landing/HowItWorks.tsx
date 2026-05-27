import {
  ClipboardList,
  FileLock,
  HardHat,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { HOW_IT_WORKS } from "@/lib/mockData";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

const ICONS = [ClipboardList, FileLock, HardHat, ShieldCheck, PackageCheck];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-b border-gray-200/70 bg-[#F7F8FA]"
    >
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <SectionHeader
          eyebrow="How it works"
          title="From requirement to delivery, in five steps."
          description="A managed workflow that combines an AI sourcing agent with a local Chinese coordination team."
        />

        <div className="relative mt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent lg:block"
          />

          <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            {HOW_IT_WORKS.map((s, i) => {
              const Icon = ICONS[i] ?? ClipboardList;
              return (
                <Reveal key={s.step} delay={i * 0.06}>
                  <li className="group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_36px_-16px_rgba(0,0,0,0.12)]">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-4 top-3 select-none text-5xl font-semibold leading-none tracking-tight text-gray-100 transition-colors group-hover:text-[#DCE8F8]"
                    >
                      {s.step}
                    </span>

                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2747] text-white shadow-sm">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>

                    <div className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                      Step {s.step}
                    </div>
                    <div className="mt-1 text-base font-semibold text-gray-900">
                      {s.title}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {s.description}
                    </p>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
