import { STEPS } from "@/lib/landingContent";
import { ArrowLink } from "./ArrowLink";
import { InView } from "./InView";
import { SectionRule } from "./SectionRule";
import { BODY, H2, H3, LEAD, SECTION } from "./styles";

// Homepage section 3. Three numbered steps on one shared line (desktop)
// or one shared spine (phones). The full six-stage process lives on
// /how-it-works.
export function Steps() {
  return (
    <section aria-labelledby="steps-title" className={SECTION}>
      <SectionRule />
      <div className="wrap">
        <div className="grid gap-5">
          <h2 id="steps-title" className={H2}>
            {STEPS.title}
          </h2>
          <p className={LEAD}>{STEPS.lead}</p>
        </div>

        <ol className="relative mt-[clamp(40px,6vw,72px)] grid gap-y-10 min-[860px]:grid-cols-3 min-[860px]:gap-x-[clamp(28px,4vw,64px)]">
          {/* The connecting line runs along the top on wider screens. On
              phones each step draws a segment down to the next number. */}
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-4 hidden h-px bg-rule-strong min-[860px]:block"
          />
          {STEPS.items.map((step, i) => (
            <InView
              key={step.title}
              kind="reveal"
              as="li"
              delay={i * 0.08}
              className="relative grid content-start grid-cols-[32px_minmax(0,1fr)] gap-x-5 after:absolute after:-bottom-10 after:left-[15.5px] after:top-8 after:w-px after:bg-rule-strong last:after:hidden min-[860px]:grid-cols-1 min-[860px]:gap-y-6 min-[860px]:after:hidden"
            >
              <span className="type-data relative grid h-8 w-8 place-items-center rounded-full border border-ink bg-sheet text-[13px] font-semibold text-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="grid content-start gap-2.5 pt-0.5 min-[860px]:pt-0">
                <h3 className={H3}>{step.title}</h3>
                <p className={BODY}>{step.text}</p>
              </div>
            </InView>
          ))}
        </ol>

        <div className="mt-[clamp(36px,5vw,56px)]">
          <ArrowLink href="/how-it-works" cta="steps">
            {STEPS.cta}
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
