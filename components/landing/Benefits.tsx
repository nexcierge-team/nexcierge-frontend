import { BENEFITS } from "@/lib/landingContent";
import { InView } from "./InView";
import { BODY, H2, H3, SECTION } from "./styles";

// Homepage section 2. Editorial, not cards: a headline and three short
// columns, each under a thin rule. No CTA here on purpose.
export function Benefits() {
  return (
    <section aria-labelledby="benefits-title" className={SECTION}>
      <div className="wrap">
        <h2 id="benefits-title" className={H2}>
          {BENEFITS.title}
        </h2>
        <ul className="mt-[clamp(36px,5vw,64px)] grid gap-x-[clamp(28px,4vw,64px)] gap-y-10 min-[860px]:grid-cols-3">
          {BENEFITS.items.map((item, i) => (
            <InView
              key={item.title}
              kind="reveal"
              as="li"
              delay={i * 0.08}
              className="grid content-start gap-3 border-t border-rule-strong pt-6"
            >
              <h3 className={H3}>{item.title}</h3>
              <p className={BODY}>{item.text}</p>
            </InView>
          ))}
        </ul>
      </div>
    </section>
  );
}
