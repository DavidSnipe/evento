"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AnimatedPageProps = {
  children: React.ReactNode;
  className?: string;
};

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use rAF to ensure paint happens before animation starts
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      style={{
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={cn(
        "transition-all duration-350 will-change-[opacity,transform] animated-page-wrapper",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className
      )}
    >
      {children}
    </div>
  );
}
