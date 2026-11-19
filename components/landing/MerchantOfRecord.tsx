import { MOR } from "@/lib/landingContent";
import { ArrowLink } from "./ArrowLink";
import { MorFlow } from "./MorFlow";
import { H2, SECTION } from "./styles";

// Homepage section 4: the one dark section on the page. Nexcierge is the
// seller (Merchant of Record), explained in plain words.
export function MerchantOfRecord() {
  return (
    <section
      aria-labelledby="mor-title"
      className={`bg-navy-grid text-white ${SECTION}`}
    >
      <div className="wrap grid gap-[clamp(40px,5vw,72px)] min-[1060px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] min-[1060px]:items-center">
        <div className="grid justify-items-start gap-5">
          <h2 id="mor-title" className={`${H2} text-white`}>
            {MOR.title}
          </h2>
          {MOR.lead.map((p) => (
            <p
              key={p}
              className="max-w-[54ch] text-[clamp(1.0625rem,1rem+0.3vw,1.1875rem)] leading-[1.6] text-white/80"
            >
              {p}
            </p>
          ))}
          <ArrowLink href="/why-nexcierge" tone="light" cta="mor" className="mt-2">
            {MOR.cta}
          </ArrowLink>
        </div>
        <MorFlow tone="dark" />
      </div>
    </section>
  );
}
