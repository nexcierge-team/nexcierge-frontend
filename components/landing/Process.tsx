import { cn } from "@/lib/utils";
import { PROCESS, type StepWho } from "@/lib/landingContent";
import { InView } from "./InView";
import { ProcessRoll } from "./ProcessRoll";
import { SectionHead } from "./SectionHead";
import { StepIcon } from "./StepIcon";
import { H3, TAG } from "./styles";

const WHO: Record<StepWho, string> = {
  ai: "bg-ink text-sheet",
  human: "bg-paint",
  partner: "",
};

// Sheet 3. Three layouts from one markup:
//   phones          a vertical spine with numbered discs
//   wide            a 3 x 2 grid of step cards
//   wide + tall     (`roll` variant) the section pins and the cards slide
//                   past horizontally as you scroll, like a drawing roll
export function Process() {
  return (
    <ProcessRoll
      id="process"
      count={PROCESS.steps.length}
      className="roll-section relative py-[clamp(60px,8vw,108px)] roll:h-[calc(100vh+var(--roll-dist))] roll:py-0"
    >
      <InView kind="draw" className="sheet-rule" />
      {/* Top-aligned with the same top padding as SECTION, so the rule to
          title gap matches every other sheet whatever the viewport height. */}
      <div className="roll:sticky roll:top-0 roll:flex roll:h-screen roll:flex-col roll:overflow-hidden roll:pb-6 roll:pt-[clamp(60px,8vw,108px)]">
        <div className="wrap roll:w-full">
          <SectionHead
            title={PROCESS.title}
            lead={PROCESS.lead}
            className="roll:mb-9"
          />
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute bottom-5 left-[calc(var(--edge)+19px)] top-5 w-0.5 bg-ink min-[960px]:hidden"
          />
          <ol className="roll-track relative grid px-[var(--edge)] min-[960px]:grid-cols-3 min-[960px]:gap-5 roll:flex roll:w-max roll:gap-6 roll:pr-[20vw]">
            {PROCESS.steps.map((step, i) => (
              <li
                key={step.title}
                className="relative grid grid-cols-[40px_1fr] gap-x-[18px] py-[22px] min-[960px]:grid-cols-1 min-[960px]:content-start min-[960px]:gap-y-[18px] min-[960px]:border min-[960px]:border-ink min-[960px]:bg-sheet min-[960px]:px-[26px] min-[960px]:pb-[30px] min-[960px]:pt-[26px] roll:w-[400px] roll:flex-none"
              >
                <div className="type-display relative z-[1] grid h-10 w-10 place-items-center rounded-full bg-ink font-extrabold tabular-nums text-sheet min-[960px]:h-auto min-[960px]:w-auto min-[960px]:justify-items-start min-[960px]:rounded-none min-[960px]:bg-transparent min-[960px]:text-[3.2rem] min-[960px]:leading-[0.9] min-[960px]:text-ink">
                  {i + 1}
                </div>
                <div className="grid content-start gap-2.5 pb-1.5">
                  <StepIcon name={step.icon} />
                  <h3 className={H3}>{step.title}</h3>
                  <p className="max-w-[46ch] text-ink-soft">{step.text}</p>
                  <span className={cn(TAG, WHO[step.who])}>
                    {step.whoLabel}
                  </span>
                </div>
              </li>
            ))}
          </ol>

          <div
            aria-hidden="true"
            className="mt-7 hidden items-center px-[var(--edge)] roll:flex"
          >
            <span className="type-data whitespace-nowrap text-[13px] font-semibold text-ink-soft">
              {PROCESS.scaleFrom}
            </span>
            <b className="relative mx-3.5 h-px flex-1 bg-rule-strong">
              <i
                className="absolute -top-px left-0 h-[3px] w-full origin-left bg-ink"
                style={{ transform: "scaleX(var(--roll-p, 0))" }}
              />
            </b>
            <span className="type-data whitespace-nowrap text-[13px] font-semibold text-ink-soft">
              {PROCESS.scaleTo}
            </span>
          </div>
        </div>
      </div>
    </ProcessRoll>
  );
}
