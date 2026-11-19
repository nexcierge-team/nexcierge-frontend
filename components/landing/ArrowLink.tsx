import Link from "next/link";
import { cn } from "@/lib/utils";
import { ARROW_LINK } from "./styles";

// The secondary "learn more" link used across the marketing pages. The
// arrow nudges right on hover (transform only, so no layout shift).
export function ArrowLink({
  href,
  children,
  className,
  tone = "ink",
  cta,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: "ink" | "light";
  // PostHog placement tag, as on the primary CTAs.
  cta?: string;
}) {
  return (
    <Link
      href={href}
      data-ph-capture-attribute-cta={cta}
      className={cn(
        ARROW_LINK,
        tone === "light" &&
          "text-white decoration-white/40 hover:decoration-white focus-visible:ring-paint focus-visible:ring-offset-ink",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}
