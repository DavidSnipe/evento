"use client";

import type { ReactNode } from "react";

import { motionStaggerDelay } from "@/lib/motion/premium";
import { cn } from "@/lib/utils";

type MotionFadeUpProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "span";
};

export function MotionFadeUp({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: MotionFadeUpProps) {
  return (
    <Tag className={cn("motion-fade-up", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

type MotionStaggerGridProps = {
  children: ReactNode;
  className?: string;
};

export function MotionStaggerGrid({ children, className }: MotionStaggerGridProps) {
  return <div className={cn("motion-stagger-grid", className)}>{children}</div>;
}

type MotionStaggerItemProps = {
  children: ReactNode;
  className?: string;
  index?: number;
};

export function MotionStaggerItem({ children, className, index = 0 }: MotionStaggerItemProps) {
  return (
    <div
      className={cn("motion-stagger-item", className)}
      style={{ animationDelay: `${motionStaggerDelay(index)}ms` }}
    >
      {children}
    </div>
  );
}
