"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { RigHandle } from "./engine";
import { MACHINES, TERMS, TERM_LANGS } from "./terms";

// The hero shows one machine with two of its four spec callouts. Indices
// are into MACHINES (same order as the engine's models) and into that
// machine's specs / model anchors (0 top left, 1 top right, 2 bottom
// left, 3 bottom right). To show another machine, change MACHINE: 0
// excavator (boom length, operating weight), 1 filling machine, 2 lab
// centrifuge, 3 CNC machining centre (spindle speed, table size).
const MACHINE = 3;
const LABEL: Record<number, string> = {
  0: "Technical drawing of a 21-tonne crawler excavator",
  1: "Technical drawing of a four-head liquid filling machine",
  2: "Technical drawing of a benchtop laboratory centrifuge",
  3: "Technical drawing of a CNC vertical machining centre cutting a pocket in a workpiece",
};
const SHOWN = [
  { spec: 1, pos: "right-0 top-[2%] min-[960px]:top-[4%]" },
  { spec: 2, pos: "left-0 bottom-0 min-[960px]:bottom-[6%]" },
];

/**
 * Shell for the hero's 3D machine drawing.
 *
 * Everything here renders on the server: the drawing box at its final
 * aspect ratio and the two spec callouts, so there is no layout shift and
 * the headline stays the largest paint. The three.js engine is fetched
 * with a plain dynamic import() once the browser is idle and draws into
 * the box; if WebGL is missing (or the import fails) the box collapses to
 * the callouts alone.
 */
export function HeroRig() {
  const hostRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<RigHandle | null>(null);

  const [langI, setLangI] = useState(0);
  const [fading, setFading] = useState(false);
  const [noGl, setNoGl] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let handle: RigHandle | null = null;

    const start = () => {
      import("./engine")
        .then(({ createRig }) => {
          if (cancelled) return;
          handle = createRig({
            host,
            callouts: calloutRefs.current.filter(
              (n): n is HTMLDivElement => n != null,
            ),
            anchorIndex: SHOWN.map((s) => s.spec),
            cycle: false,
            start: MACHINE,
            reduce: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches,
            onSelect: () => {},
            onActive: () => {},
          });
          if (!handle) setNoGl(true);
          engineRef.current = handle;
        })
        .catch(() => {
          if (!cancelled) setNoGl(true);
        });
    };

    // Stay out of the way of first paint and hydration.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 200);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      handle?.dispose();
      engineRef.current = null;
    };
  }, []);

  // The hero is `position: sticky`. Pin it at top 0 when it fits the
  // viewport; when it is taller (phones, short laptop windows), pin it at
  // a negative top so it scrolls until its bottom edge is on screen first.
  useEffect(() => {
    const hero = hostRef.current?.closest<HTMLElement>("[data-hero]");
    if (!hero) return;
    const place = () => {
      hero.style.top = `${Math.min(0, window.innerHeight - hero.offsetHeight)}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(hero);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      hero.style.top = "";
    };
  }, []);

  // Each spec term slowly cycles through the languages a brief is held in.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swap = 0;
    const tick = window.setInterval(() => {
      const engine = engineRef.current;
      if (document.hidden) return;
      if (engine && (engine.isBusy() || !engine.isVisible())) return;
      setFading(true);
      swap = window.setTimeout(() => {
        setLangI((i) => (i + 1) % TERM_LANGS.length);
        setFading(false);
      }, 240);
    }, 4200);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(swap);
    };
  }, []);

  const lang = TERM_LANGS[langI];
  const specs = MACHINES[MACHINE].specs;

  return (
    <figure className="min-w-0" aria-label={LABEL[MACHINE]}>
      <div
        ref={hostRef}
        className={cn(
          "group/rig relative",
          noGl
            ? "flex flex-wrap gap-3"
            : // Taller on phones so the bottom callout clears the tracks.
              "aspect-[1/0.9] min-[600px]:aspect-[1/0.74] min-[960px]:-mr-[calc(var(--gutter)*0.5)]",
        )}
      >
        {SHOWN.map(({ spec, pos }, i) => {
          const [key, value] = specs[spec];
          return (
            <div
              key={key}
              ref={(node) => {
                calloutRefs.current[i] = node;
              }}
              className={cn(
                "z-[2] grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 border border-rule-strong bg-sheet px-2.5 pb-1.5 pt-2 transition-opacity duration-200 group-data-[rig=busy]/rig:opacity-0 min-[960px]:px-3 min-[960px]:pb-2",
                noGl ? "static w-[176px]" : cn("absolute w-[clamp(132px,40%,176px)]", pos),
              )}
            >
              <span
                dir={lang.code === "ar" ? "rtl" : "ltr"}
                className={cn(
                  "type-data overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium leading-[1.3] text-ink-soft transition-opacity duration-200 min-[960px]:text-[13px]",
                  fading && "opacity-0",
                )}
              >
                {TERMS[key][lang.code]}
              </span>
              <span className="type-data justify-self-end text-[10px] font-semibold text-ink-soft">
                {lang.tag}
              </span>
              <strong className="col-span-full text-[15px] font-semibold leading-tight tabular-nums min-[960px]:text-base">
                {value}
              </strong>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
