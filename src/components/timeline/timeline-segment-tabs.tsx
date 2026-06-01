"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { TimelineEventSegment } from "@/types/timeline";
import { TIMELINE_EVENT_SEGMENTS } from "@/types/timeline";

type TimelineSegmentTabsProps = {
  value: TimelineEventSegment | "all";
  onChange: (segment: TimelineEventSegment | "all") => void;
  counts: Record<TimelineEventSegment | "all", number>;
  className?: string;
};

export function TimelineSegmentTabs({
  value,
  onChange,
  counts,
  className,
}: TimelineSegmentTabsProps) {
  const tabs = useMemo(
    () => [
      { id: "all" as const, label: ro.timeline.segment.all },
      ...TIMELINE_EVENT_SEGMENTS.map((seg) => ({
        id: seg,
        label: ro.timeline.segment[seg],
      })),
    ],
    []
  );

  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto pb-1 scrollbar-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
              active
                ? "bg-gradient-to-r from-[#E8748A] to-[#B8516B] text-white shadow-sm"
                : "border border-[rgba(210,170,185,0.25)] bg-white/70 text-text-secondary hover:border-[#B8516B]/30 hover:text-[#B8516B]"
            )}
          >
            {tab.label}
            {count > 0 && (
              <span
                className={cn(
                  "ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]",
                  active ? "bg-white/20" : "bg-[#FEF0F3] text-[#B8516B]"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
