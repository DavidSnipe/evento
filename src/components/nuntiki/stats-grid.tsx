import * as React from "react";

import { cn } from "@/lib/utils";
import { statsGridVariants, type StatsGridVariants } from "@/lib/nuntiki/variants";

export type StatsGridProps = React.HTMLAttributes<HTMLDivElement> & StatsGridVariants;

export function StatsGrid({ columns, className, children, ...props }: StatsGridProps) {
  return (
    <div className={cn(statsGridVariants({ columns }), className)} {...props}>
      {children}
    </div>
  );
}
