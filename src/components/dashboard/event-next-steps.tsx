import Link from "next/link";

import { SectionCard } from "@/components/nuntiki/section-card";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type EventNextStepsProps = {
  eventId: string;
};

function getActions(eventId: string) {
  return [
    {
      label: ro.dashboard.nextSteps.addGuests,
      href: `/dashboard/events/${eventId}/guests`,
    },
    {
      label: ro.dashboard.nextSteps.configureRsvp,
      href: `/dashboard/events/${eventId}/rsvp`,
    },
    {
      label: ro.dashboard.nextSteps.planBudget,
      href: `/dashboard/events/${eventId}/budget`,
    },
    {
      label: ro.dashboard.nextSteps.addVendors,
      href: `/dashboard/events/${eventId}/vendors`,
    },
  ];
}

export function EventNextSteps({ eventId }: EventNextStepsProps) {
  return (
    <SectionCard title={ro.dashboard.nextSteps.title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {getActions(eventId).map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "inline-flex items-center justify-center rounded-full border border-[var(--dash-blush)]/50",
              "bg-[var(--dash-blush)]/20 px-4 py-2.5 text-center text-xs font-semibold",
              "text-[var(--dash-accent-text)] transition hover:bg-[var(--dash-blush)]/35"
            )}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

export function shouldShowEventNextSteps(input: {
  createdAt: string;
  guestCount: number;
  tableCount: number;
}): boolean {
  const createdMs = Date.now() - new Date(input.createdAt).getTime();
  const isRecentlyCreated = createdMs < 10 * 60 * 1000;
  const isEmptyEvent = input.guestCount === 0 && input.tableCount === 0;
  return isRecentlyCreated || isEmptyEvent;
}
