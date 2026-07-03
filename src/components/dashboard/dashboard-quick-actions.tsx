import Link from "next/link";
import { LayoutGrid, Mail, PiggyBank, Store, type LucideIcon } from "lucide-react";

import { SectionCard } from "@/components/nuntiki/section-card";
import { ro } from "@/lib/i18n/ro";
import type { DashboardSummary } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

type DashboardQuickActionsProps = {
  eventId: string;
  summary: DashboardSummary;
};

type QuickChip = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export function DashboardQuickActions({ eventId, summary }: DashboardQuickActionsProps) {
  const budgetPercent = summary.budget.remainingPercent ?? 100;

  const chips: QuickChip[] = [
    {
      label: ro.dashboard.quickChips.guests.replace("{count}", String(summary.guests.unassigned)),
      href: `/dashboard/events/${eventId}/seating`,
      icon: LayoutGrid,
    },
    {
      label: ro.dashboard.quickChips.rsvp.replace("{count}", String(summary.guests.pendingRsvp)),
      href: `/dashboard/events/${eventId}/rsvp`,
      icon: Mail,
    },
    {
      label: ro.dashboard.quickChips.budget.replace("{percent}", String(budgetPercent)),
      href: `/dashboard/events/${eventId}/budget`,
      icon: PiggyBank,
    },
    {
      label: ro.dashboard.quickChips.vendors.replace("{count}", String(summary.vendors.categoriesCount)),
      href: `/dashboard/events/${eventId}/vendors`,
      icon: Store,
    },
  ];

  return (
    <SectionCard title={ro.dashboard.quickActions}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none sm:flex-wrap sm:overflow-visible">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <Link
              key={chip.href}
              href={chip.href}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--dash-hairline)]",
                "bg-[var(--dash-accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--dash-accent-text)]",
                "transition hover:bg-[var(--dash-blush)]/25"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {chip.label}
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}
