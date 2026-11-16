import { cn } from "@/lib/utils";
import { RISKS } from "@/lib/landingContent";
import { InView } from "./InView";
import { SectionHead } from "./SectionHead";
import { H3, SECTION } from "./styles";

const NODE =
  "border-[1.5px] border-ink bg-white px-2.5 py-2.5 text-center text-[13px] font-bold [font-stretch:108%] min-[860px]:px-[22px] min-[860px]:py-3.5 min-[860px]:text-base";
const LINK = "h-[1.5px] min-w-2.5 bg-ink";
const ROW_LABEL =
  "type-data col-span-full text-[13px] font-semibold text-ink-soft";

function Struck({ children }: { children: string }) {
  return (
    <div className={cn(NODE, "relative text-ink-soft")}>
      {children}
      <span
        aria-hidden="true"
        className="absolute -left-[8%] -right-[8%] top-1/2 h-[2.5px] -rotate-[14deg] bg-redline"
      />
      <span className="sr-only"> (removed)</span>
    </div>
  );
}

// Sheet 2. Both chains are always on the page, one above the other on a
// shared grid, so the before and after read at a glance: the Nexcierge
// node sits exactly where Agent and Trader were.
function ChainDiagram() {
  return (
    <figure className="mb-[clamp(28px,4vw,48px)] border-[1.5px] border-ink bg-sheet p-[clamp(16px,3vw,28px)]">
      <div className="grid grid-cols-[auto_minmax(12px,1fr)_auto_minmax(10px,28px)_auto_minmax(12px,1fr)_auto] items-center gap-y-3">
        <div className={ROW_LABEL}>The usual chain</div>
        <div className={NODE}>Buyer</div>
        <div className={LINK} />
        <Struck>Agent</Struck>
        <div className={LINK} />
        <Struck>Trader</Struck>
        <div className={LINK} />
        <div className={NODE}>Factory</div>

        <div className={cn(ROW_LABEL, "mt-3")}>With Nexcierge</div>
        <div className={NODE}>Buyer</div>
        <div className={LINK} />
        <div className="type-title col-span-3 border-2 border-ink bg-paint px-3 py-2 text-center font-extrabold leading-[1.15] min-[860px]:py-2.5">
          Nexcierge
          <small className="type-data block text-xs font-semibold">
            Merchant of Record
          </small>
        </div>
        <div className={LINK} />
        <div className={NODE}>Factory</div>
      </div>
      <figcaption className="mt-4 text-sm text-ink-soft">
        {RISKS.chainCaption}
      </figcaption>
    </figure>
  );
}

const CARD_LABEL = "type-data text-[13px] font-bold uppercase";

export function Risks() {
  return (
    <section id="risks" className={SECTION}>
      <InView kind="draw" className="sheet-rule" />
      <div className="wrap">
        <SectionHead title={RISKS.title} lead={RISKS.lead} />
        <ChainDiagram />

        {/* Each card is two stacked halves. Subgrid keeps the "fix" halves
            level across the three cards whatever the copy length. */}
        <ol className="grid gap-5 min-[860px]:grid-cols-3">
          {RISKS.items.map((item, i) => (
            <InView
              key={item.risk}
              kind="reveal"
              as="li"
              delay={i * 0.12}
              className="grid border-[1.5px] border-ink min-[860px]:row-span-2 min-[860px]:grid-rows-subgrid min-[860px]:gap-y-0"
            >
              <div className="grid content-start gap-3 bg-sheet p-[clamp(18px,2.4vw,26px)]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cn(CARD_LABEL, "text-redline")}>
                    The risk
                  </span>
                  <span className="type-data text-[13px] font-bold text-ink-soft">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className={cn(
                    H3,
                    "relative my-1.5 inline-block -rotate-[1.2deg] justify-self-start text-redline",
                  )}
                >
                  {item.risk}
                  <svg
                    className="scribble"
                    viewBox="0 0 200 60"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path pathLength={1} d={item.scribble} />
                  </svg>
                </h3>
                <p className="max-w-[44ch] text-ink-soft">{item.riskText}</p>
              </div>
              <div className="border-t-[1.5px] border-ink bg-white p-[clamp(18px,2.4vw,26px)]">
                <div className="grid content-start gap-2 border-l-[6px] border-paint pl-[18px]">
                  <span className={CARD_LABEL}>The fix</span>
                  <h3 className={H3}>{item.fix}</h3>
                  <p className="max-w-[52ch]">{item.fixText}</p>
                </div>
              </div>
            </InView>
          ))}
        </ol>
      </div>
    </section>
  );
}
