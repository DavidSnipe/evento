"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";

type TimelineModeNavProps = {
  eventId: string;
  className?: string;
};

export function TimelineModeNav({ eventId, className }: TimelineModeNavProps) {
  const pathname = usePathname();
  const isDay = pathname.includes("/timeline/day");

  const tabs = [
    {
      href: `/dashboard/events/${eventId}/timeline`,
      label: ro.daySchedule.mode.planning,
      active: !isDay,
    },
    {
      href: `/dashboard/events/${eventId}/timeline/day`,
      label: ro.daySchedule.mode.dayOf,
      active: isDay,
    },
  ];

  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-[rgba(210,170,185,0.25)] bg-white/80 p-1",
        className
      )}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
            tab.active
              ? "bg-gradient-to-r from-[#E8748A] to-[#B8516B] text-white shadow-sm"
              : "text-text-secondary hover:text-[#B8516B]"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
