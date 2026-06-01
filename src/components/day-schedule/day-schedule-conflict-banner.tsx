"use client";

import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ScheduleConflict } from "@/lib/day-schedule/conflicts";

type DayScheduleConflictBannerProps = {
  conflicts: ScheduleConflict[];
  className?: string;
};

export function DayScheduleConflictBanner({
  conflicts,
  className,
}: DayScheduleConflictBannerProps) {
  if (conflicts.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="space-y-1.5 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            {conflicts.length === 1
              ? "1 avertisment în program"
              : `${conflicts.length} avertismente în program`}
          </p>
          <ul className="space-y-1 text-xs text-amber-800/90">
            {conflicts.slice(0, 4).map((c, i) => (
              <li key={`${c.type}-${i}`}>· {c.message}</li>
            ))}
            {conflicts.length > 4 && (
              <li className="italic">· …și alte {conflicts.length - 4}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
