"use client";

import { useState } from "react";
import { SCOPE } from "@/lib/landingContent";
import { cn } from "@/lib/utils";
import { TAG } from "./styles";

// Pick how far Nexcierge carries the machine; the route fills to match.
export function ScopeSelector() {
  const [index, setIndex] = useState(0);
  const [financing, setFinancing] = useState(false);
  const option = SCOPE.options[index];
  const last = SCOPE.stops.length - 1;

  return (
    <div className="grid gap-[26px] border-[1.5px] border-ink bg-sheet p-[clamp(18px,3vw,32px)]">
      <div
        className="grid grid-cols-2 gap-2 min-[760px]:grid-cols-4"
        role="group"
        aria-label="Delivery scope"
      >
        {SCOPE.options.map((o, i) => (
          <button
            key={o.title}
            type="button"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className="min-h-[52px] rounded-sm border-[1.5px] border-ink bg-white p-3 text-left font-bold leading-[1.15] transition-colors [font-stretch:104%] aria-pressed:bg-ink aria-pressed:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-2 focus-visible:ring-offset-sheet"
          >
            {o.title}
          </button>
        ))}
      </div>

      <div className="relative pt-1.5" aria-hidden="true">
        <div className="absolute left-[8.333%] right-[8.333%] top-5 h-1 bg-rule">
          <i
            className="absolute inset-0 origin-left bg-ink transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
            style={{ transform: `scaleX(${option.upto / last})` }}
          />
        </div>
        <ol className="relative grid grid-cols-6">
          {SCOPE.stops.map((stop, i) => {
            const reached = i <= option.upto;
            return (
              <li key={stop} className="grid justify-items-center gap-2 text-center">
                <i
                  className={cn(
                    "h-5 w-5 rounded-full border-2 border-ink transition-[background-color,transform] delay-150 duration-300",
                    reached ? "scale-[1.15] bg-paint" : "bg-sheet",
                  )}
                />
                <span
                  className={cn(
                    "type-data text-xs font-semibold leading-[1.15] transition-colors duration-300 min-[760px]:text-sm",
                    reached ? "text-ink" : "text-ink-soft",
                  )}
                >
                  {stop}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-2" aria-live="polite">
        <strong className="type-title text-lg">{option.title}</strong>
        <p className="max-w-[62ch] text-ink-soft">{option.text}</p>
        <span className={TAG}>{option.term}</span>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 font-semibold">
        <input
          type="checkbox"
          checked={financing}
          onChange={(e) => setFinancing(e.target.checked)}
          className="m-0 h-[22px] w-[22px] accent-ink"
        />
        {SCOPE.financing}
      </label>
      {financing && (
        <p className="max-w-[70ch] text-sm text-ink-soft">
          {SCOPE.financingText}
        </p>
      )}
    </div>
  );
}
