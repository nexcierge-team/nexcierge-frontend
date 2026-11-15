import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CLOSING } from "@/lib/landingContent";
import { InView } from "./InView";
import { H2, LEAD } from "./styles";

// The last sheet. There is deliberately no lead form here: the agent is
// the intake, and it is the only path that runs the full interview and
// the required-field check before a brief reaches an account manager.
export function ClosingCTA() {
  return (
    <section
      id="start"
      className="border-t-[1.5px] border-ink bg-sheet py-[clamp(60px,8vw,108px)]"
    >
      <div className="wrap grid gap-[clamp(24px,4vw,48px)] min-[960px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[960px]:items-end">
        <div className="grid gap-5">
          <InView kind="plot" as="h2" className={H2}>
            {CLOSING.title}
          </InView>
          <p className={LEAD}>{CLOSING.lead}</p>
        </div>
        <div className="grid justify-items-start gap-4 min-[960px]:justify-items-end">
          <Button asChild size="lg">
            <Link href="/chat" data-ph-capture-attribute-cta="closing">
              {CLOSING.cta}
            </Link>
          </Button>
          <p className="text-sm text-ink-soft">
            {CLOSING.partner}{" "}
            <Link
              href="/contact"
              className="font-semibold text-ink underline underline-offset-4"
            >
              {CLOSING.partnerLink}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
