import Image from "next/image";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";

const STATS = [
  { value: "1,200+", label: "manufacturers vetted across machinery categories" },
  { value: "6 sectors", label: "from packaging to industrial automation" },
  { value: "5–7 days", label: "average from inquiry to qualified shortlist" },
];

export function ManufacturingNetwork() {
  return (
    <section className="border-b border-gray-200/70 bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <Reveal>
            <div>
              <SectionHeader
                eyebrow="The network"
                title="A managed network of verified manufacturers."
                description="Nexcierge maintains an active roster of Chinese manufacturers across the categories where they lead globally. Onboarding and verification is continuous — not a one-time directory."
              />

              <dl className="mt-10 grid gap-6 sm:grid-cols-3">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <dt className="text-3xl font-semibold tracking-tight text-gray-900">
                      {s.value}
                    </dt>
                    <dd className="mt-1.5 text-xs leading-relaxed text-gray-500">
                      {s.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-2xl">
              <Image
                src="/illustrations/manufacturing-pana.svg"
                alt="Manufacturing floor with multiple machines"
                width={750}
                height={500}
                className="h-auto w-full"
                priority={false}
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
