import { MOR } from "@/lib/landingContent";
import { cn } from "@/lib/utils";

type Tone = "dark" | "light";

// You -> Nexcierge -> Manufacturer. Horizontal when its container is wide
// enough (container query, so it works in a half-width column too),
// vertical otherwise; labels never shrink below 13px.
export function MorFlow({
  tone = "dark",
  showFlows = false,
  className,
}: {
  tone?: Tone;
  // Show what passes along each link (contract, purchase order).
  showFlows?: boolean;
  className?: string;
}) {
  const dark = tone === "dark";
  const nodes = [MOR.nodes.you, MOR.nodes.nex, MOR.nodes.factory];

  return (
    <figure className={cn("@container", className)}>
      <figcaption className="sr-only">{MOR.diagramLabel}</figcaption>
      <ol className="grid @[34rem]:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.25fr)_auto_minmax(0,1.1fr)] @[34rem]:items-stretch">
        {nodes.map((node, i) => {
          const isNex = i === 1;
          return (
            <li key={node.title} className="contents">
              {i > 0 && (
                <Connector dark={dark} label={showFlows ? MOR.flows[i - 1] : undefined} />
              )}
              <div
                className={cn(
                  "grid content-center gap-1 px-5 py-4",
                  isNex
                    ? "bg-paint text-ink"
                    : dark
                      ? "border border-white/35 text-white"
                      : "border border-rule-strong bg-sheet text-ink",
                )}
              >
                <span className="type-title text-lg font-semibold leading-tight">
                  {node.title}
                </span>
                <span
                  className={cn(
                    "text-sm leading-snug",
                    isNex ? "text-ink/80" : dark ? "text-white/70" : "text-ink-soft",
                  )}
                >
                  {node.sub}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function Connector({ dark, label }: { dark: boolean; label?: string }) {
  const line = dark ? "bg-white/50" : "bg-rule-strong";
  const head = dark ? "border-white/70" : "border-ink-soft";
  return (
    <div
      aria-hidden={label ? undefined : true}
      className={cn(
        "flex min-h-12 items-center gap-3 pl-6 @[34rem]:min-h-0 @[34rem]:flex-col @[34rem]:justify-center @[34rem]:gap-2 @[34rem]:pl-0",
        label ? "@[34rem]:w-[clamp(96px,19cqi,136px)]" : "@[34rem]:w-[clamp(56px,9cqi,112px)]",
      )}
    >
      {/* vertical line + arrowhead (narrow) */}
      <span className="relative flex h-12 flex-col items-center @[34rem]:hidden">
        <span className={cn("w-px flex-1", line)} />
        <span className={cn("-mt-1.5 h-2 w-2 rotate-45 border-b border-r", head)} />
      </span>
      {/* horizontal line + arrowhead (wide) */}
      <span className="relative hidden w-full items-center @[34rem]:flex">
        <span className={cn("h-px flex-1", line)} />
        <span className={cn("-ml-1.5 h-2 w-2 -rotate-45 border-b border-r", head)} />
      </span>
      {label && (
        <span
          className={cn(
            "type-data text-[13px] font-medium leading-tight @[34rem]:text-center",
            dark ? "text-white/70" : "text-ink-soft",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
