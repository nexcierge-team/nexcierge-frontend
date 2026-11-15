"use client";

import { Fragment, useState } from "react";
import { MOR, type MorKey } from "@/lib/landingContent";
import { cn } from "@/lib/utils";

// You -> Nexcierge -> Factory, with the paperwork that flows along each
// link. Every node and chip is a button that swaps the explanation below.
export function MorDiagram() {
  const [active, setActive] = useState<MorKey>("nex");

  return (
    <div>
      <div className="grid min-[960px]:grid-cols-[1fr_auto_1.15fr_auto_1fr] min-[960px]:items-stretch">
        {MOR.nodes.map((node, i) => {
          const on = active === node.key;
          const isNex = node.key === "nex";
          return (
            <Fragment key={node.key}>
              {i > 0 && (
                <div
                  aria-hidden="true"
                  className="flex h-[54px] items-center gap-3 pl-7 min-[960px]:h-auto min-[960px]:w-[132px] min-[960px]:flex-col min-[960px]:justify-center min-[960px]:gap-2 min-[960px]:pl-0"
                >
                  <i className="flow-y block h-full w-0.5 bg-[repeating-linear-gradient(180deg,#fff_0_7px,transparent_7px_14px)] bg-[length:100%_14px] min-[960px]:hidden" />
                  <i className="flow-x hidden h-0.5 w-full bg-[repeating-linear-gradient(90deg,#fff_0_7px,transparent_7px_14px)] bg-[length:14px_100%] min-[960px]:block" />
                  <span className="type-data text-[13px] font-medium leading-tight opacity-90 min-[960px]:px-2 min-[960px]:text-center">
                    {MOR.flows[i - 1]}
                  </span>
                </div>
              )}
              <button
                type="button"
                aria-pressed={on}
                aria-controls="mor-detail"
                onClick={() => setActive(node.key)}
                className={cn(
                  "grid min-w-0 gap-0.5 border-[1.5px] px-4 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-paint focus-visible:ring-offset-2 focus-visible:ring-offset-blueprint",
                  isNex
                    ? "border-paint bg-paint text-ink"
                    : on
                      ? "border-white bg-white text-blueprint"
                      : "border-white text-white hover:bg-white/10",
                  isNex && on && "shadow-[inset_0_0_0_3px_var(--color-ink)]",
                )}
              >
                <b className="text-xl font-extrabold leading-[1.1] [font-stretch:120%]">
                  {node.title}
                </b>
                <span className="type-data text-sm font-medium opacity-85">
                  {node.sub}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        {MOR.chips.map((chip) => {
          const on = active === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={on}
              aria-controls="mor-detail"
              onClick={() => setActive(chip.key)}
              className={cn(
                "min-h-[42px] rounded-full border-[1.5px] px-[15px] py-[9px] text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-paint",
                on
                  ? "border-solid border-white bg-white text-blueprint"
                  : "border-dashed border-white text-white hover:bg-white/10",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <p
        id="mor-detail"
        aria-live="polite"
        className="mt-5 min-h-[108px] max-w-[60ch] border-l-4 border-paint bg-white/[0.08] px-[18px] py-4"
      >
        {MOR.detail[active]}
      </p>
    </div>
  );
}
