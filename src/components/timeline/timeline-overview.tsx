"use client";

import { CheckCircle2, Clock, ListTodo, Sparkles, AlertTriangle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { TimelineStats } from "@/lib/timeline/stats";

type TimelineOverviewProps = {
  stats: TimelineStats;
  className?: string;
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(210,170,185,0.2)] bg-white/80 px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
          {label}
        </p>
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            accent
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2 font-serif text-2xl font-bold text-[#1A0E14]">{value}</p>
    </div>
  );
}

export function TimelineOverview({ stats, className }: TimelineOverviewProps) {
  const t = ro.timeline.overview;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-[rgba(210,170,185,0.22)] bg-gradient-to-br from-[#FEF8F9] via-white to-[#FFFDFE] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B8516B]">
              {t.progressLabel}
            </p>
            <p className="font-serif text-4xl font-bold text-[#1A0E14]">
              {stats.progressPercent}%
              <span className="ml-2 text-base font-normal text-text-secondary">
                {t.complete}
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {stats.completed} {t.of} {stats.total} {t.tasksDone}
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Progress value={stats.progressPercent} className="h-2.5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t.total}
          value={stats.total}
          icon={ListTodo}
          accent="bg-[#FEF0F3] text-[#B8516B]"
        />
        <StatCard
          label={t.completed}
          value={stats.completed}
          icon={CheckCircle2}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label={t.inProgress}
          value={stats.inProgress}
          icon={Sparkles}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label={t.upcoming}
          value={stats.upcoming}
          icon={Clock}
          accent="bg-sky-50 text-sky-600"
        />
        <StatCard
          label={t.overdue}
          value={stats.overdue}
          icon={AlertTriangle}
          accent="bg-red-50 text-red-500"
        />
      </div>
    </div>
  );
}

export function TimelineOverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-[#FCEAEF]/40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-[#FCEAEF]/30" />
        ))}
      </div>
    </div>
  );
}
