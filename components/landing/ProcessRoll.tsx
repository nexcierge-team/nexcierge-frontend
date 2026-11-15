"use client";

import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import type { MotionStyle } from "framer-motion";

interface ProcessRollProps {
  id: string;
  // Number of steps; drives the CSS pin distance (--roll-n).
  count: number;
  className?: string;
  children: ReactNode;
}

/**
 * The scroll driver for the process "drawing roll". It owns nothing but a
 * number: section scroll progress, written to --roll-p. Layout, the pin
 * (position: sticky) and the track transform are all CSS under the `roll`
 * variant in globals.css, so:
 *   - the section height is the same before and after hydration, and hash
 *     links to later sections land in the right place;
 *   - narrow / short viewports and reduced motion get the plain grid with
 *     no JS branch (the variable is simply unused there).
 */
export function ProcessRoll({ id, count, className, children }: ProcessRollProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 42,
    restDelta: 0.0005,
  });

  const style = {
    "--roll-n": count,
    "--roll-p": progress,
  } as CSSProperties as MotionStyle;

  return (
    <motion.section ref={ref} id={id} className={className} style={style}>
      {children}
    </motion.section>
  );
}
