"use client";

import type { ReactNode } from "react";

type MarketplaceMotionShellProps = {
  children: ReactNode;
  filterKey: string;
};

export function MarketplaceMotionShell({ children, filterKey }: MarketplaceMotionShellProps) {
  return (
    <div key={filterKey} className="motion-marketplace-results">
      {children}
    </div>
  );
}
