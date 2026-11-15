"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

type Kind = "plot" | "reveal" | "draw";

interface InViewProps {
  // Which CSS choreography to run (see `[data-plot]`, `[data-reveal]`,
  // `[data-draw]` in globals.css).
  kind: Kind;
  as?: "div" | "h2" | "li" | "section" | "ol" | "ul" | "p";
  id?: string;
  className?: string;
  style?: CSSProperties;
  // Stagger for `reveal`, in seconds.
  delay?: number;
  children?: ReactNode;
}

/**
 * Runs a one-shot CSS animation when the element scrolls into view.
 *
 * The element is server-rendered fully visible. On mount we only hide it
 * (data-*="pending") if it is still below the fold, then flip it to "run"
 * when it arrives. So with no JS, with reduced motion, or when the
 * observer never fires, content simply stays visible. The attribute is
 * written straight to the DOM node, so nothing re-renders.
 */
export function InView({
  kind,
  as = "div",
  id,
  className,
  style,
  delay,
  children,
}: InViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen at mount: leave it alone rather than flashing it
    // out and back in.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const key = kind;
    el.dataset[key] = "pending";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset[key] = "run";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      delete el.dataset[key];
    };
  }, [kind]);

  const merged: CSSProperties | undefined =
    delay != null
      ? ({ ...style, "--reveal-delay": `${delay}s` } as CSSProperties)
      : style;

  // Every allowed tag is a plain HTML element, so one element type is
  // enough for the ref; the cast only narrows the JSX tag for TypeScript.
  const Tag = as as "div";
  return (
    <Tag ref={ref} id={id} className={className} style={merged}>
      {children}
    </Tag>
  );
}
