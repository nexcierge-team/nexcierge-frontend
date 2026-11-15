import { cn } from "@/lib/utils";
import { InView } from "./InView";
import { H2, LEAD } from "./styles";

interface SectionHeadProps {
  title: string;
  lead?: string;
  className?: string;
  // On the blueprint sheet the lead is white, not ink-soft.
  onBlueprint?: boolean;
  children?: React.ReactNode;
}

export function SectionHead({
  title,
  lead,
  className,
  onBlueprint,
  children,
}: SectionHeadProps) {
  return (
    <div className={cn("mb-[clamp(36px,5vw,64px)] grid gap-5", className)}>
      <InView kind="plot" as="h2" className={H2}>
        {title}
      </InView>
      {lead && (
        <p className={cn(LEAD, onBlueprint && "text-white/80")}>{lead}</p>
      )}
      {children}
    </div>
  );
}
