import { cn } from "@/lib/utils";
import { H1, LEAD, PAGE_TOP } from "./styles";

// The opening of every inner marketing page: one headline, one lead, an
// optional action row, over the same faint drafting grid as the homepage.
export function PageHero({
  title,
  lead,
  children,
  className,
}: {
  title: string;
  lead: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="page-title"
      className={cn("bg-drafting pb-[clamp(56px,8vw,112px)]", PAGE_TOP, className)}
    >
      <div className="wrap grid justify-items-start gap-6">
        <h1 id="page-title" className={cn(H1, "hero-in max-w-[20ch]")}>
          {title}
        </h1>
        <p className={cn(LEAD, "hero-in")} style={{ animationDelay: "0.12s" }}>
          {lead}
        </p>
        {children && (
          <div
            className="hero-in mt-2 flex w-full flex-wrap items-center gap-x-7 gap-y-3"
            style={{ animationDelay: "0.2s" }}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
