import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  statsCardVariants,
  statsLabelVariants,
  statsValueVariants,
  type StatsCardVariants,
  type StatsValueVariants,
} from "@/lib/nuntiki/variants";

export type StatsCardProps = React.HTMLAttributes<HTMLDivElement> &
  StatsCardVariants &
  StatsValueVariants & {
    label: string;
    value: React.ReactNode;
    icon?: LucideIcon;
    trend?: React.ReactNode;
    footer?: React.ReactNode;
    progress?: number;
  };

export function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  footer,
  progress,
  accent,
  className,
  ...props
}: StatsCardProps) {
  return (
    <Card className={cn(statsCardVariants({ accent }), className)} {...props}>
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={statsLabelVariants()}>{label}</p>
            <p className={statsValueVariants({ accent })}>{value}</p>
          </div>
          {Icon ? (
            <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--dash-text-muted)]" aria-hidden />
          ) : null}
        </div>
        <div className="mt-auto space-y-2">
          {trend ? (
            <p className="truncate text-[11px] font-medium text-[var(--dash-text-secondary)]">{trend}</p>
          ) : null}
          {typeof progress === "number" ? <Progress value={progress} className="h-1.5" /> : null}
          {footer ? <div>{footer}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
