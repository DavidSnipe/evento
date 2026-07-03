"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

import { usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";

type SidebarActiveIndicatorProps = {
  navRef: RefObject<HTMLElement | null>;
  pathname: string;
  collapsed: boolean;
};

export function SidebarActiveIndicator({ navRef, pathname, collapsed }: SidebarActiveIndicatorProps) {
  const reduced = usePrefersReducedMotion();
  const [indicator, setIndicator] = useState({ top: 0, height: 0, visible: false });

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || collapsed) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const active = nav.querySelector<HTMLElement>('.dash-sidebar-nav-item[data-active="true"]');
    if (!active) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    setIndicator({
      top: active.offsetTop,
      height: active.offsetHeight,
      visible: true,
    });
  }, [navRef, pathname, collapsed]);

  if (collapsed || !indicator.visible) {
    return null;
  }

  return (
    <span
      className="motion-sidebar-indicator"
      style={{
        transform: `translateY(${indicator.top}px)`,
        height: indicator.height,
        transition: reduced ? "none" : undefined,
      }}
      aria-hidden
    />
  );
}
