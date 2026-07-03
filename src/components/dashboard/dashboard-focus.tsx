import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DashboardSummary } from "@/lib/dashboard/queries";
import { formatDaysUntil } from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";

type DashboardFocusProps = {
  eventId: string;
  eventTitle: string;
  daysUntil: number | null;
  summary: DashboardSummary;
};

type NextStep = {
  label: string;
  href: string;
  detail?: string;
};

function resolveNextStep(eventId: string, summary: DashboardSummary): NextStep {
  const base = `/dashboard/events/${eventId}`;
  const { planning, guests } = summary;

  if (!planning.guestsAdded) {
    return {
      label: ro.dashboard.nextSteps.addGuests,
      href: `${base}/guests`,
      detail: ro.dashboard.guestsDesc,
    };
  }
  if (!planning.rsvpConfigured) {
    return {
      label: ro.dashboard.nextSteps.configureRsvp,
      href: `${base}/rsvp`,
    };
  }
  if (guests.pendingRsvp > 0) {
    return {
      label: ro.dashboard.nextSteps.configureRsvp,
      href: `${base}/rsvp`,
      detail: ro.dashboard.quickChips.rsvp.replace("{count}", String(guests.pendingRsvp)),
    };
  }
  if (guests.unassigned > 0) {
    return {
      label: ro.dashboard.progressSteps.seating,
      href: `${base}/seating`,
      detail: ro.dashboard.quickChips.guests.replace("{count}", String(guests.unassigned)),
    };
  }
  if (!planning.seatingCreated) {
    return {
      label: ro.dashboard.progressSteps.seating,
      href: `${base}/seating`,
    };
  }
  if (!planning.budgetSet) {
    return {
      label: ro.dashboard.nextSteps.planBudget,
      href: `${base}/budget`,
    };
  }
  if (!planning.vendorsAdded) {
    return {
      label: ro.dashboard.nextSteps.addVendors,
      href: `${base}/vendors`,
    };
  }
  if (!planning.timelinePlanned) {
    return {
      label: ro.dashboard.progressSteps.timeline,
      href: `${base}/timeline`,
    };
  }

  return {
    label: ro.events.detail.overview,
    href: base,
  };
}

function buildStatusLine(summary: DashboardSummary): string {
  const { guests, planning } = summary;
  const segments = [`${guests.total} ${ro.dashboard.guests.toLowerCase()}`];

  if (guests.accepted > 0) {
    segments.push(`${guests.accepted} ${ro.guests.stats.accepted.toLowerCase()}`);
  }
  if (summary.seating.totalGuests > 0 && summary.seating.progressPercent < 100) {
    segments.push(`${summary.seating.progressPercent}% la masă`);
  }

  segments.push(
    ro.dashboard.planningSummary
      .replace("{completed}", String(planning.completedCount))
      .replace("{total}", String(planning.totalSteps))
  );

  return segments.join(" · ");
}

function secondaryLinks(eventId: string, primaryHref: string) {
  const base = `/dashboard/events/${eventId}`;
  const candidates = [
    { label: ro.dashboard.guests, href: `${base}/guests` },
    { label: ro.nav.seating, href: `${base}/seating` },
    { label: ro.dashboard.budget, href: `${base}/budget` },
    { label: ro.nav.rsvp, href: `${base}/rsvp` },
  ];

  return candidates.filter((link) => link.href !== primaryHref).slice(0, 4);
}

export function DashboardFocus({ eventId, eventTitle, daysUntil, summary }: DashboardFocusProps) {
  const next = resolveNextStep(eventId, summary);
  const progressPercent = Math.round(
    (summary.planning.completedCount / summary.planning.totalSteps) * 100
  );
  const shortcuts = secondaryLinks(eventId, next.href);
  const daysLabel = formatDaysUntil(daysUntil);

  return (
    <section className="evento-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--dash-text-muted)]">
            {eventTitle}
          </p>
          {daysLabel ? (
            <p className="text-3xl font-bold tracking-tight text-[var(--dash-text)] sm:text-4xl">
              {daysLabel}
            </p>
          ) : null}
          <p className="text-sm text-[var(--dash-text-secondary)]">{buildStatusLine(summary)}</p>
          <div className="max-w-md space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-[var(--dash-text-muted)]">
              <span>{ro.dashboard.planningProgress}</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto lg:min-w-[220px]">
          {next.detail ? (
            <p className="text-sm font-medium text-[var(--dash-text)]">{next.detail}</p>
          ) : null}
          <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
            <Link href={next.href}>
              {next.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="min-h-11 w-full sm:w-auto">
            <Link href={`/dashboard/events/${eventId}`}>{ro.events.detail.overview}</Link>
          </Button>
        </div>
      </div>

      {shortcuts.length > 0 ? (
        <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto border-t border-[var(--dash-hairline)] px-1 pt-5 scrollbar-none">
          {shortcuts.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[var(--dash-hairline)] bg-[var(--dash-ivory)] px-4 text-xs font-semibold text-[var(--dash-text-secondary)] transition hover:border-[var(--dash-accent-text)]/30 hover:text-[var(--dash-accent-text)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
