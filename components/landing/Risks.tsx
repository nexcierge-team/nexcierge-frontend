import { cn } from "@/lib/utils";
import { RISKS } from "@/lib/landingContent";
import { InView } from "./InView";
import { BODY, H2, H3, LABEL, LEAD, SECTION } from "./styles";

const NODE =
  "grid place-items-center border border-ink bg-white px-2 py-2 text-center text-[13px] font-semibold leading-tight text-ink min-[560px]:px-4 min-[560px]:py-2.5 min-[560px]:text-[15px] min-[860px]:px-6 min-[860px]:py-3 min-[860px]:text-base";
const LINK = "h-px min-w-2 bg-ink";

// A middleman in the usual chain, struck through in red pencil.
function Struck({ children }: { children: string }) {
  return (
    <div className={cn(NODE, "relative border-rule-strong text-ink-soft")}>
      {children}
      <span
        aria-hidden="true"
        className="absolute -left-[10%] -right-[10%] top-1/2 h-[2px] -rotate-[14deg] bg-redline"
      />
      <span className="sr-only"> (removed)</span>
    </div>
  );
}

// Both chains on one shared grid, so the before and after read at a
// glance: the Nexcierge node sits exactly where Agent and Trader were.
// Fits a 320px phone without shrinking labels below 13px.
function ChainDiagram() {
  const c = RISKS.chain;
  return (
    <figure className="border border-rule-strong bg-white p-[clamp(16px,3vw,36px)]">
      <div className="grid grid-cols-[auto_minmax(10px,1fr)_auto_minmax(6px,24px)_auto_minmax(10px,1fr)_auto] items-center gap-y-3">
        <div className={cn(LABEL, "col-span-full")}>{c.usual}</div>
        <div className={NODE}>{c.buyer}</div>
        <div className={LINK} />
        <Struck>{c.middle[0]}</Struck>
        <div className={LINK} />
        <Struck>{c.middle[1]}</Struck>
        <div className={LINK} />
        <div className={NODE}>{c.factory}</div>

        <div className={cn(LABEL, "col-span-full mt-4")}>{c.ours}</div>
        <div className={NODE}>{c.buyer}</div>
        <div className={LINK} />
        <div className="col-span-3 grid place-items-center border border-ink bg-paint px-3 py-1.5 text-center min-[860px]:py-2">
          <span className="type-title font-semibold leading-tight text-ink min-[560px]:text-lg">
            {c.nex}
          </span>
          <span className="type-data text-xs font-medium text-ink/75 min-[560px]:text-[13px]">
            {c.nexSub}
          </span>
        </div>
        <div className={LINK} />
        <div className={NODE}>{c.factory}</div>
      </div>
      <figcaption className="mt-5 text-sm text-ink-soft">{c.caption}</figcaption>
    </figure>
  );
}

// Homepage section 2. One diagram, then three plain columns: the risk
// circled in red pencil, a line on what goes wrong, and our fix under a
// paint rule. No card boxes.
export function Risks() {
  return (
    <section aria-labelledby="risks-title" className={SECTION}>
      <div className="wrap">
        <div className="grid gap-5">
          <h2 id="risks-title" className={H2}>
            {RISKS.title}
          </h2>
          <p className={LEAD}>{RISKS.lead}</p>
        </div>

        <div className="mt-[clamp(32px,5vw,56px)]">
          <ChainDiagram />
        </div>

        <ul className="mt-[clamp(40px,6vw,72px)] grid gap-x-[clamp(28px,4vw,64px)] gap-y-12 min-[860px]:grid-cols-3">
          {RISKS.items.map((item, i) => (
            <InView
              key={item.risk}
              kind="reveal"
              as="li"
              delay={i * 0.08}
              className="grid content-start gap-3"
            >
              <p className="pl-1">
                <span className="sr-only">The risk: </span>
                <span className="type-title relative inline-block -rotate-[1.2deg] text-lg font-semibold text-redline">
                  {item.risk}
                  <svg
                    className="scribble"
                    viewBox="0 0 200 60"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path pathLength={1} d={item.scribble} />
                  </svg>
                </span>
              </p>
              <p className="max-w-[44ch] text-[15px] leading-[1.6] text-ink-soft">
                {item.riskText}
              </p>
              <div className="mt-3 grid gap-2 border-l-[3px] border-paint pl-4">
                <h3 className={H3}>
                  <span className="sr-only">Our fix: </span>
                  {item.fix}
                </h3>
                <p className={BODY}>{item.fixText}</p>
              </div>
            </InView>
          ))}
        </ul>
      </div>
    </section>
  );
}
