import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CLOSING, CTA } from "@/lib/landingContent";
import { ArrowLink } from "./ArrowLink";
import { SectionRule } from "./SectionRule";
import { H2, LEAD, SECTION } from "./styles";

// The closing invitation, shared by every marketing page. No lead form:
// the sourcing assistant is the intake, and it is the only path that runs
// the full interview and the required-field check before a brief reaches
// an account manager.
export function ClosingCTA({
  secondary = { href: "/how-it-works", label: CLOSING.secondary },
  placement = "closing",
  divider = true,
}: {
  secondary?: { href: string; label: string } | null;
  // PostHog placement tag for the primary button.
  placement?: string;
  // Off when the section above is the navy one (its edge is the divider).
  divider?: boolean;
}) {
  return (
    <section aria-labelledby="closing-title" className={SECTION}>
      {divider && <SectionRule />}
      <div className="wrap">
        <div className="grid justify-items-start gap-5">
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
