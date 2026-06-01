"use client";

import { formatEventDate } from "@/lib/events/utils";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";

type DayScheduleDateTabsProps = {
  dates: string[];
  value: string;
  onChange: (date: string) => void;
  onAddDate?: (date: string) => void;
  className?: string;
};

export function DayScheduleDateTabs({
  dates,
  value,
  onChange,
  onAddDate,
  className,
}: DayScheduleDateTabsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {dates.map((date) => {
          const active = value === date;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onChange(date)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2.5 text-xs font-semibold transition-all min-h-[44px]",
                active
                  ? "bg-[#1A0E14] text-white shadow-sm"
                  : "border border-[rgba(210,170,185,0.25)] bg-white/80 text-text-secondary hover:border-[#B8516B]/30"
              )}
            >
              {formatEventDate(date) ?? date}
            </button>
          );
        })}
      </div>
      {onAddDate && (
        <label className="inline-flex items-center gap-2 rounded-full border border-dashed border-[rgba(210,170,185,0.4)] px-3 py-2 text-xs font-medium text-text-secondary hover:border-[#B8516B]/40 cursor-pointer min-h-[44px]">
          <span>{ro.daySchedule.dates.add}</span>
          <input
            type="date"
            className="sr-only"
            onChange={(e) => {
              if (e.target.value) onAddDate(e.target.value);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
