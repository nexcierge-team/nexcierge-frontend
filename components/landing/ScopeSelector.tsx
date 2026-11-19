"use client";

import { useId, useState } from "react";
import { SCOPE } from "@/lib/landingContent";
import { cn } from "@/lib/utils";

// Pick how far Nexcierge carries the machine; the route fills to match.
// Options are radio-style toggles; the route below is decorative and the
// selected option's text carries the meaning.
export function ScopeSelector() {
  const [index, setIndex] = useState(0);
  const [financing, setFinancing] = useState(false);
  const option = SCOPE.options[index];
  const last = SCOPE.stops.length - 1;
  const financeId = useId();

  return (
    <div className="grid gap-8">
      <div
        className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4"
        role="group"
        aria-label="Delivery option"
      >
        {SCOPE.options.map((o, i) => (
          <button
            key={o.title}
            type="button"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className="min-h-[52px] rounded-sm border border-rule-strong bg-white px-4 py-3 text-left font-semibold leading-tight text-ink transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {o.title}
          </button>
        ))}
      </div>

      <div className="relative pt-1" aria-hidden="true">
        <div className="absolute left-[8.333%] right-[8.333%] top-[13px] h-0.5 bg-rule">
          <i
            className="absolute inset-0 origin-left bg-ink transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
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
                    "h-[18px] w-[18px] rounded-full border-2 border-ink transition-colors delay-100 duration-300 motion-reduce:transition-none",
                    reached ? "bg-paint" : "bg-paper",
                  )}
                />
                <span
                  className={cn(
                    "type-data px-0.5 text-[12px] font-medium leading-[1.2] transition-colors duration-300 min-[600px]:text-[13px]",
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

      <div className="grid gap-2 border-t border-rule-strong pt-6" aria-live="polite">
        <p className="type-data text-[13px] font-medium text-ink-soft">{option.term}</p>
        <p className="type-title text-xl font-semibold text-ink">{option.title}</p>
        <p className="max-w-[64ch] leading-[1.65] text-ink-soft">{option.text}</p>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor={financeId}
          className="flex min-h-11 cursor-pointer items-center gap-3 justify-self-start font-medium text-ink"
        >
          <input
            id={financeId}
            type="checkbox"
            checked={financing}
            onChange={(e) => setFinancing(e.target.checked)}
            className="m-0 h-5 w-5 accent-ink"
          />
          {SCOPE.financing}
        </label>
        {financing && (
          <p className="max-w-[64ch] text-[15px] leading-[1.6] text-ink-soft">
            {SCOPE.financingText}
          </p>
        )}
      </div>

      <p className="text-sm text-ink-soft">{SCOPE.note}</p>
    </div>
  );
}
