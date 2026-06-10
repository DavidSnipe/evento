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
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={statsLabelVariants()}>{label}</p>
            <p className={statsValueVariants({ accent })}>{value}</p>
            {trend ? (
              <p className="mt-1 text-[11px] font-medium text-text-secondary">{trend}</p>
            ) : null}
          </div>
          {Icon ? (
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : null}
        </div>
        {typeof progress === "number" ? (
          <Progress value={progress} className="mt-3 h-2" />
        ) : null}
        {footer ? <div className="mt-2">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
