import Link from "next/link";
import { CalendarHeart, PiggyBank, Users, UtensilsCrossed } from "lucide-react";

import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { PlanningProgress } from "@/components/dashboard/planning-progress";
import { EventCard } from "@/components/events/event-card";
import { DashboardPage } from "@/components/layout/animated-page";
import { PageHeader } from "@/components/nuntiki/page-header";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { StatsGrid } from "@/components/nuntiki/stats-grid";
import { Button } from "@/components/ui/button";
import { getDashboardSummary } from "@/lib/dashboard/queries";
import { reconcileActiveEventAccess } from "@/lib/events/active-event-access";
import { getPrimaryEvent, getUserEvents } from "@/lib/events/queries";
import { formatDaysUntil, getDaysUntil } from "@/lib/events/utils";
import { getGuestStats } from "@/lib/guests/queries";
import { ro } from "@/lib/i18n/ro";
import { getServerUser } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

function formatLei(value: number) {
  return `${value.toLocaleString("ro-RO")} RON`;
}

export default async function DashboardPageRoute() {
  const [user, events, activeEventId] = await Promise.all([
    getServerUser(),
    getUserEvents(),
    reconcileActiveEventAccess(),
  ]);
  const primaryEvent = await getPrimaryEvent(events);
  const statsEvent = activeEventId
    ? events.find((e) => e.id === activeEventId) ?? primaryEvent
    : primaryEvent;

  const [guestStats, summary] = await Promise.all([
    statsEvent ? getGuestStats(statsEvent.id) : Promise.resolve(null),
    statsEvent ? getDashboardSummary(statsEvent.id) : Promise.resolve(null),
  ]);

  const days = primaryEvent ? getDaysUntil(primaryEvent.event_date) : null;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  const firstName = fullName?.split(" ")[0]?.split("@")[0] ?? ro.dashboard.defaultName;
  const recentEvents = events.slice(0, 3);
  const hasActiveEvent = Boolean(statsEvent && summary);

  return (
    <DashboardPage
      header={
        <PageHeader
          title={`${ro.dashboard.welcome}, ${firstName}`}
          description={ro.dashboard.description}
        />
      }
      stats={
        hasActiveEvent && summary ? (
          <StatsGrid columns={5}>
            <StatsCard
              label={ro.dashboard.eventsCount}
              value={events.length}
              trend={ro.dashboard.eventsCountDesc}
              icon={CalendarHeart}
            />
            <StatsCard
              label={ro.dashboard.daysToGo}
              value={formatDaysUntil(days)}
              trend={statsEvent?.title ?? ro.dashboard.daysToGoDesc}
              icon={CalendarHeart}
            />
            <StatsCard
              label={ro.dashboard.guests}
              value={summary.guests.total}
              trend={`${summary.guests.accepted} ${ro.guests.stats.accepted.toLowerCase()}`}
              icon={Users}
              footer={
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs font-semibold text-[var(--dash-accent-text)] hover:text-[var(--dash-accent-text)]/80"
                  asChild
                >
                  <Link href={`/dashboard/events/${statsEvent!.id}/guests`}>
                    {ro.dashboard.viewAll}
                  </Link>
                </Button>
              }
            />
            <StatsCard
              label={ro.dashboard.seatingAssigned}
              value={`${summary.seating.assignedGuests}/${summary.seating.totalGuests}`}
              trend={
                summary.seating.totalGuests > 0
                  ? `${summary.seating.progressPercent}% la masă`
                  : "Niciun invitat încă"
              }
              icon={UtensilsCrossed}
              progress={summary.seating.progressPercent}
              accent="primary"
            />
            <StatsCard
              label={ro.dashboard.budgetUsed}
              value={
                summary.budget.total != null && summary.budget.total > 0
                  ? `${formatLei(summary.budget.spent)} / ${formatLei(summary.budget.total)}`
                  : formatLei(summary.budget.spent)
              }
              trend={
                summary.budget.consumedPercent != null
                  ? `${summary.budget.consumedPercent}% consumat`
                  : ro.dashboard.budgetDesc
              }
              icon={PiggyBank}
              progress={summary.budget.consumedPercent ?? undefined}
              accent="warning"
            />
          </StatsGrid>
        ) : (
          <StatsGrid columns={3}>
            <StatsCard
              label={ro.dashboard.eventsCount}
              value={events.length}
              trend={ro.dashboard.eventsCountDesc}
              icon={CalendarHeart}
            />
            <StatsCard
              label={ro.dashboard.daysToGo}
              value={formatDaysUntil(days)}
              trend={primaryEvent?.title ?? ro.dashboard.daysToGoDesc}
              icon={CalendarHeart}
            />
            <StatsCard
              label={ro.dashboard.guests}
              value={guestStats?.total ?? "—"}
              trend={
                statsEvent
                  ? `${guestStats?.accepted ?? 0} ${ro.guests.stats.accepted.toLowerCase()}`
                  : ro.dashboard.guestsDesc
              }
              icon={Users}
              footer={
                statsEvent ? (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs font-semibold text-[var(--dash-accent-text)] hover:text-[var(--dash-accent-text)]/80"
                    asChild
                  >
                    <Link href={`/dashboard/events/${statsEvent.id}/guests`}>
                      {ro.dashboard.viewAll}
                    </Link>
                  </Button>
                ) : null
              }
            />
          </StatsGrid>
        )
      }
    >
      {events.length === 0 ? (
        <OnboardingChecklist />
      ) : (
        <>
          {hasActiveEvent && summary ? (
            <div className="mb-6 space-y-6">
              <DashboardQuickActions eventId={statsEvent!.id} summary={summary} />
              <PlanningProgress planning={summary.planning} />
            </div>
          ) : null}

          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[1.125rem] font-semibold tracking-[-0.012em] text-[var(--dash-text)]">
                {ro.dashboard.yourEvents}
              </h2>
              <Button
                variant="ghost"
                className="text-xs font-semibold text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
                asChild
              >
                <Link href="/dashboard/events">{ro.dashboard.viewAll}</Link>
              </Button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isActive={activeEventId === event.id}
                  index={index}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </DashboardPage>
  );
}
