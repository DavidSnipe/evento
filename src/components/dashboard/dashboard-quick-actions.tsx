import Link from "next/link";

import { SectionCard } from "@/components/nuntiki/section-card";
import { ro } from "@/lib/i18n/ro";
import type { DashboardSummary } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

type DashboardQuickActionsProps = {
  eventId: string;
  summary: DashboardSummary;
};

export function DashboardQuickActions({ eventId, summary }: DashboardQuickActionsProps) {
  const budgetPercent = summary.budget.remainingPercent ?? 100;

  const chips = [
    {
      label: `📋 ${ro.dashboard.quickChips.guests.replace("{count}", String(summary.guests.unassigned))}`,
      href: `/dashboard/events/${eventId}/seating`,
    },
    {
      label: `💌 ${ro.dashboard.quickChips.rsvp.replace("{count}", String(summary.guests.pendingRsvp))}`,
      href: `/dashboard/events/${eventId}/rsvp`,
    },
    {
      label: `💰 ${ro.dashboard.quickChips.budget.replace("{percent}", String(budgetPercent))}`,
      href: `/dashboard/events/${eventId}/budget`,
    },
    {
      label: `🌸 ${ro.dashboard.quickChips.vendors.replace("{count}", String(summary.vendors.categoriesCount))}`,
      href: `/dashboard/events/${eventId}/vendors`,
    },
  ];

  return (
    <SectionCard title={ro.dashboard.quickActions}>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className={cn(
              "inline-flex items-center rounded-full border border-[var(--dash-blush)]/45",
              "bg-[var(--dash-blush)]/18 px-3.5 py-2 text-xs font-semibold text-[var(--dash-accent-text)]",
              "transition hover:bg-[var(--dash-blush)]/32"
            )}
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
