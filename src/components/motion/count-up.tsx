"use client";

import { useEffect, useState } from "react";

import { MOTION_DURATION_SLOW } from "@/lib/motion/premium";
import { usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type CountUpProps = {
  value: number;
  duration?: number;
  className?: string;
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({ value, duration = MOTION_DURATION_SLOW, className }: CountUpProps) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * easeOutCubic(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return <span className={cn("tabular-nums", className)}>{display}</span>;
}
