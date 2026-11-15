import { MOR } from "@/lib/landingContent";
import { MorDiagram } from "./MorDiagram";
import { SectionHead } from "./SectionHead";

// Sheet 6: the one cyanotype sheet on the page.
export function MerchantOfRecord() {
  return (
    <section
      id="mor"
      className="bg-cyanotype relative py-[clamp(60px,8vw,108px)] text-white"
    >
      <div className="wrap">
        <div className="grid gap-[clamp(32px,5vw,64px)] min-[960px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[960px]:items-start">
          <SectionHead
            title={MOR.title}
            lead={MOR.lead}
            onBlueprint
            className="mb-0"
          />
          <MorDiagram />
        </div>

        <ul className="mt-[clamp(40px,6vw,72px)] grid grid-cols-2 border-t border-white/50 min-[960px]:grid-cols-4">
          {MOR.ones.map((label) => (
            <li key={label} className="grid gap-0.5 pb-1.5 pt-5">
              <b className="type-display text-[clamp(3rem,2rem+5vw,6rem)] font-extrabold leading-[0.9] text-paint">
                1
              </b>
              <span className="max-w-[14ch] font-semibold leading-tight [font-stretch:108%]">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
