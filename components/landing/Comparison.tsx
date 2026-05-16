import { Check, Minus } from "lucide-react";
import { COMPARISON_ROWS } from "@/lib/mockData";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

export function Comparison() {
  return (
    <section className="border-b border-zinc-200/70 bg-[#fbfbfd]">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeader
          eyebrow="Why Nexcierge"
          title="A different way to source machinery."
          description="Traditional channels move at the speed of trade fairs and broker emails. We move at the speed of a managed AI workflow."
        />

        <Reveal>
          <div className="mt-14 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="grid grid-cols-3 border-b border-zinc-200 bg-zinc-50/70 px-6 py-4 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              <div></div>
              <div>Traditional sourcing</div>
              <div className="text-zinc-900">Nexcierge</div>
            </div>
            <div className="divide-y divide-zinc-200">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-3 items-start gap-4 px-6 py-5 text-sm"
                >
                  <div className="font-medium text-zinc-900">{row.label}</div>
                  <div className="flex items-start gap-2 text-zinc-500">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" strokeWidth={1.5} />
                    <span>{row.traditional}</span>
                  </div>
                  <div className="flex items-start gap-2 text-zinc-900">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" strokeWidth={2} />
                    <span>{row.nexcierge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
