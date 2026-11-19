import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CLOSING, CTA } from "@/lib/landingContent";
import { ArrowLink } from "./ArrowLink";
import { H2, LEAD } from "./styles";

// The closing invitation, shared by every marketing page. No lead form:
// the sourcing assistant is the intake, and it is the only path that runs
// the full interview and the required-field check before a brief reaches
// an account manager.
export function ClosingCTA({
  secondary = { href: "/how-it-works", label: CLOSING.secondary },
  placement = "closing",
}: {
  secondary?: { href: string; label: string } | null;
  // PostHog placement tag for the primary button.
  placement?: string;
}) {
  return (
    // Only bottom padding of its own: the rule below carries the top
    // spacing, so it doesn't double up on the section before it.
    <section
      aria-labelledby="closing-title"
      className="pb-[clamp(64px,9vw,128px)] pt-[clamp(32px,5vw,64px)]"
    >
      <div className="wrap">
        <div className="grid justify-items-start gap-5 border-t border-rule-strong pt-[clamp(48px,7vw,96px)]">
          <h2 id="closing-title" className={H2}>
            {CLOSING.title}
          </h2>
          <p className={LEAD}>{CLOSING.lead}</p>
          <div className="mt-3 flex w-full flex-wrap items-center gap-x-7 gap-y-3">
            <Button asChild size="lg" className="max-[479px]:w-full">
              <Link href="/chat" data-ph-capture-attribute-cta={placement}>
                {CTA.start}
              </Link>
            </Button>
            {secondary && (
              <ArrowLink href={secondary.href}>{secondary.label}</ArrowLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
