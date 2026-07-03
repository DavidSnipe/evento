"use client";

import type { LucideIcon } from "lucide-react";

import { CountUp } from "@/components/motion/count-up";
import { MotionStaggerItem } from "@/components/motion/fade-up";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { StatsGrid } from "@/components/nuntiki/stats-grid";
import { formatDaysUntil } from "@/lib/events/utils";

type DashboardStatsMotionProps = {
  eventsCount: number;
  daysUntil: number | null;
  primaryEventTitle: string | null;
  eventsCountLabel: string;
  eventsCountDesc: string;
  daysToGoLabel: string;
  daysToGoDesc: string;
  icon: LucideIcon;
};

export function DashboardStatsMotion({
  eventsCount,
  daysUntil,
  primaryEventTitle,
  eventsCountLabel,
  eventsCountDesc,
  daysToGoLabel,
  daysToGoDesc,
  icon,
}: DashboardStatsMotionProps) {
  const daysValue =
    daysUntil != null && daysUntil > 1 ? (
      <>
        <CountUp value={daysUntil} /> zile
      </>
    ) : (
      formatDaysUntil(daysUntil)
    );

  return (
    <StatsGrid columns={2} className="motion-stagger-grid">
      <MotionStaggerItem index={0}>
        <StatsCard
          label={eventsCountLabel}
          value={<CountUp value={eventsCount} />}
          trend={eventsCountDesc}
          icon={icon}
        />
      </MotionStaggerItem>
      <MotionStaggerItem index={1}>
        <StatsCard
          label={daysToGoLabel}
          value={daysValue}
          trend={primaryEventTitle ?? daysToGoDesc}
          icon={icon}
        />
      </MotionStaggerItem>
    </StatsGrid>
  );
}
