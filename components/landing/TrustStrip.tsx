import { Globe2, Lock, ShieldCheck, Workflow } from "lucide-react";
import { Reveal } from "./Reveal";

const BADGES = [
  { icon: ShieldCheck, label: "Human-verified sourcing" },
  { icon: Globe2, label: "Domestic Market Access" },
  { icon: Lock, label: "End to End Security" },
  { icon: Workflow, label: "Managed procurement support" },
];

export function TrustStrip() {
  return (
    <section className="border-b border-gray-200/70 bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Reveal>
          <ul className="grid grid-cols-1 gap-y-4 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {BADGES.map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-3 text-sm text-gray-700"
              >
                <b.icon className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
                <span>{b.label}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
