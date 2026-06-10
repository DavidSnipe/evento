"use client";

import * as React from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

export type NuntikiProviderProps = {
  children: React.ReactNode;
};

/**
 * Wraps feature routes that use Nuntiki tooltips.
 * Add to a layout when migrating pages — not required for Phase 0 components alone.
 */
export function NuntikiProvider({ children }: NuntikiProviderProps) {
  return <TooltipProvider delayDuration={300}>{children}</TooltipProvider>;
}
