import Link from "next/link";
import { Calendar, MapPin, Pencil, Settings, Users, UtensilsCrossed } from "lucide-react";

import { setActiveEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import {
  EventNextSteps,
  shouldShowEventNextSteps,
} from "@/components/dashboard/event-next-steps";
import { DashboardPage } from "@/components/layout/animated-page";
import { PageHeader } from "@/components/nuntiki/page-header";
import { SectionCard } from "@/components/nuntiki/section-card";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { StatsGrid } from "@/components/nuntiki/stats-grid";
import { Button } from "@/components/ui/button";
import { getActiveEventId } from "@/lib/events/active-event";
import { getEventTypeLabel } from "@/lib/events/config";
import { getEventAccessContext } from "@/lib/events/verify-event";
import { canDeleteEvent, canManageCollaborators } from "@/lib/collaboration/permissions";
import { getGuestStats } from "@/lib/guests/queries";
import { getSeatingPlan } from "@/lib/seating/queries";
import {
  formatDaysUntil,
  formatEventDate,
  getDaysUntil,
} from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const [{ event, access }, activeEventId, guestStats, seating] = await Promise.all([
    getEventAccessContext(id),
    getActiveEventId(),
    getGuestStats(id),
    getSeatingPlan(id),
  ]);

  const days = getDaysUntil(event.event_date);
  const isActive = activeEventId === event.id;
  const showOwnerActions = canManageCollaborators(access);
  const showDelete = canDeleteEvent(access);
  const showNextSteps = shouldShowEventNextSteps({
    createdAt: event.created_at,
    guestCount: guestStats.total,
    tableCount: seating.tables.length,
  });

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {!isActive ? (
        <form action={setActiveEvent.bind(null, event.id)}>
          <Button type="submit" variant="secondary" className="h-9 text-xs">
            {ro.events.detail.setActive}
          </Button>
        </form>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-blush)]/50 bg-[var(--dash-blush)]/25 px-3 py-1.5 text-xs font-semibold text-[var(--dash-accent-text)]">
          {ro.events.detail.active}
        </span>
      )}
      {showOwnerActions ? (
        <Button variant="outline" className="h-9 text-xs" asChild>
          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {ro.events.detail.edit}
          </Link>
        </Button>
      ) : null}
      <Button variant="outline" className="h-9 text-xs" asChild>
        <Link href={`/dashboard/events/${event.id}/settings/calendar`}>
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          {ro.calendar.subscription.settingsNav}
        </Link>
      </Button>
      <Button variant="outline" className="h-9 text-xs" asChild>
        <Link href={`/dashboard/events/${event.id}/settings/collaborators`}>
          <Settings className="mr-1.5 h-3.5 w-3.5" />
          {ro.collaboration.settingsLink}
        </Link>
      </Button>
      {showDelete ? <DeleteEventButton eventId={event.id} /> : null}
    </div>
  );

  return (
    <DashboardPage
      header={
        <PageHeader
          title={event.title}
          description={getEventTypeLabel(event.event_type)}
          actions={headerActions}
        />
      }
      stats={
        <StatsGrid columns={3}>
          <StatsCard
            label={ro.dashboard.daysToGo}
            value={formatDaysUntil(days)}
            trend={formatEventDate(event.event_date) ?? ro.events.detail.noDate}
          />
          <StatsCard
            label={ro.events.subNav.guests}
            value={guestStats.total}
            trend={`${guestStats.accepted} confirmați`}
            accent="success"
          />
          <StatsCard
            label={ro.events.subNav.seating}
            value={seating.tables.length}
            trend={`${seating.unassigned.length} fără masă`}
            accent="primary"
          />
        </StatsGrid>
      }
    >
      {error === "delete" ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ro.events.errors.deleteFailed}
        </p>
      ) : null}

      {showNextSteps ? <EventNextSteps eventId={id} /> : null}

      <SectionCard title={ro.events.detail.overview}>
        <div className="space-y-3.5 text-xs text-[var(--dash-text-secondary)]">
          <p className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />
            {formatEventDate(event.event_date) ?? ro.events.detail.noDate}
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />
            {event.venue ?? ro.events.detail.noVenue}
          </p>
          <p className="mt-1 rounded-[12px] border border-[var(--dash-hairline)] bg-[var(--dash-warm-gray)]/50 p-3 text-[13px] leading-relaxed">
            {event.description ?? ro.events.detail.noDescription}
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/dashboard/events/${id}/guests`}
          className="flex items-center gap-4 rounded-[18px] border border-border-rose-18 bg-white/70 p-5 shadow-card transition hover:bg-[var(--dash-blush)]/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--dash-blush)]/35 text-[var(--dash-accent-text)]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--dash-text)]">{ro.events.subNav.guests}</p>
            <p className="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
              {guestStats.total} invitați · {guestStats.accepted} confirmați
            </p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${id}/seating`}
          className="flex items-center gap-4 rounded-[18px] border border-border-rose-18 bg-white/70 p-5 shadow-card transition hover:bg-[var(--dash-blush)]/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--dash-blush)]/35 text-[var(--dash-accent-text)]">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--dash-text)]">{ro.events.subNav.seating}</p>
            <p className="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
              {seating.tables.length} mese · {seating.unassigned.length} fără masă
            </p>
          </div>
        </Link>
      </div>
    </DashboardPage>
  );
}
