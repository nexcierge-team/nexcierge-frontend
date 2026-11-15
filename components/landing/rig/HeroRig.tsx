"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SEG, SEG_BTN } from "../styles";
import type { RigHandle } from "./engine";
import { MACHINES, TERMS, TERM_LANGS } from "./terms";

// Corner positions for the four callouts over the drawing.
const POS = [
  "left-2 top-[2%]",
  "right-2 top-[6%]",
  "left-2 bottom-[5%]",
  "right-2 bottom-[9%]",
];

/**
 * Shell for the hero's 3D machine drawings.
 *
 * Everything here renders on the server: the machine tabs, the drawing
 * box at its final aspect ratio, and the four spec callouts. So there is
 * no layout shift and the headline stays the largest paint. The three.js
 * engine is fetched with a plain dynamic import() once the browser is
 * idle and draws into the box; if WebGL is missing (or the import fails)
 * the box collapses to a 2 x 2 grid of the same callouts, and the tabs
 * keep working on the text alone.
 */
export function HeroRig() {
  const hostRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<RigHandle | null>(null);

  const [tab, setTab] = useState(0); // which tab is pressed
  const [active, setActive] = useState(0); // which machine's specs show
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
            reduce: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches,
            onSelect: setTab,
            onActive: setActive,
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

  // Each spec term cycles through the languages the file is held in.
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
      }, 220);
    }, 2800);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(swap);
    };
  }, []);

  function pick(i: number) {
    const engine = engineRef.current;
    if (engine) {
      engine.show(i, true);
      return;
    }
    setTab(i);
    setActive(i);
  }

  const lang = TERM_LANGS[langI];

  return (
    <div className="grid min-w-0 gap-2.5">
      <div
        className={cn(SEG, "justify-self-start bg-sheet")}
        role="group"
        aria-label="Example machine"
      >
        {MACHINES.map((m, i) => (
          <button
            key={m.name}
            type="button"
            aria-pressed={tab === i}
            onClick={() => pick(i)}
            className={SEG_BTN}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div
        ref={hostRef}
        className={cn(
          "group/rig relative",
          noGl
            ? "grid grid-cols-2 gap-2.5"
            : "-mx-[calc(var(--gutter)-6px)] aspect-[1/0.82] min-[960px]:ml-0 min-[960px]:-mr-[calc(var(--gutter)*0.5)] min-[960px]:aspect-[1/0.74]",
        )}
      >
        {MACHINES[active].specs.map(([key, value], i) => (
          <div
            key={i}
            ref={(node) => {
              calloutRefs.current[i] = node;
            }}
            className={cn(
              "z-[2] grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 border border-ink bg-sheet px-[9px] pb-1.5 pt-[7px] transition-opacity duration-200 group-data-[rig=busy]/rig:opacity-0 min-[960px]:px-3 min-[960px]:pb-2 min-[960px]:pt-[9px]",
              noGl
                ? "static"
                : cn(
                    "absolute w-[clamp(128px,44%,190px)] min-[960px]:w-[184px]",
                    POS[i],
                  ),
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
            <span className="type-data justify-self-end rounded-[2px] bg-ink px-1 py-px text-[10px] font-bold text-sheet">
              {lang.tag}
            </span>
            <strong className="col-span-full text-[15px] font-bold leading-tight tabular-nums min-[960px]:text-[17px]">
              {value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
