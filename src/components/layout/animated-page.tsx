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
      className={cn(
        "transition-all duration-300 ease-out will-change-[opacity,transform]",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className
      )}
    >
      {children}
    </div>
  );
}
