import Link from "next/link";
import { CalendarHeart, PiggyBank, Users, UtensilsCrossed } from "lucide-react";

import { DashboardFocus } from "@/components/dashboard/dashboard-focus";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { EventCard } from "@/components/events/event-card";
import { DashboardPage } from "@/components/layout/animated-page";
import { DashboardStatsMotion } from "@/components/motion/dashboard-stats-motion";
import { PageHeader } from "@/components/nuntiki/page-header";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { StatsGrid } from "@/components/nuntiki/stats-grid";
import { Button } from "@/components/ui/button";
import { getDashboardSummary } from "@/lib/dashboard/queries";
import type { DashboardSummary } from "@/lib/dashboard/queries";
import { reconcileActiveEventAccess } from "@/lib/events/active-event-access";
import { getEventListStats, getPrimaryEvent, getUserEvents } from "@/lib/events/queries";
import { formatDaysUntil, getDaysUntil } from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";
import { getServerUser } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

function formatLeiCompact(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    const formatted = compact >= 10 ? Math.round(compact) : Number(compact.toFixed(1));
    return `${formatted}k RON`;
  }
  return `${value.toLocaleString("ro-RO")} RON`;
}

function formatBudgetValue(spent: number, total: number | null) {
  if (total != null && total > 0) {
    return `${formatLeiCompact(spent)} / ${formatLeiCompact(total)}`;
  }
  return formatLeiCompact(spent);
}

function ActiveEventStats({
  eventsCount,
  daysUntil,
  eventTitle,
  eventId,
  summary,
}: {
  eventsCount: number;
  daysUntil: number | null;
  eventTitle: string;
  eventId: string;
  summary: DashboardSummary;
}) {
  const seatingTrend =
    summary.seating.totalGuests > 0
      ? `${summary.seating.progressPercent}% la masă`
      : "Niciun invitat încă";

  return (
    <StatsGrid columns={5}>
      <StatsCard
        className="h-[120px]"
        label={ro.dashboard.eventsCount}
        value={eventsCount}
        trend={ro.dashboard.eventsCountDesc}
        icon={CalendarHeart}
      />
      <StatsCard
        className="h-[120px]"
        label={ro.dashboard.daysToGo}
        value={formatDaysUntil(daysUntil)}
        trend={eventTitle || ro.dashboard.daysToGoDesc}
        icon={CalendarHeart}
      />
      <StatsCard
        className="h-[120px]"
        label={ro.dashboard.guests}
        value={summary.guests.total}
        trend={`${summary.guests.accepted} ${ro.guests.stats.accepted.toLowerCase()}`}
        icon={Users}
        footer={
          <Button
            variant="link"
            className="h-auto min-h-0 p-0 text-xs font-semibold text-[var(--dash-accent-text)]"
            asChild
          >
            <Link href={`/dashboard/events/${eventId}/guests`}>{ro.dashboard.viewAll}</Link>
          </Button>
        }
      />
      <StatsCard
        className="h-[120px]"
        label={ro.dashboard.seatingAssigned}
        value={`${summary.seating.assignedGuests}/${summary.seating.totalGuests}`}
        trend={seatingTrend}
        icon={UtensilsCrossed}
        progress={summary.seating.progressPercent}
        accent="primary"
      />
      <StatsCard
        className="h-[120px]"
        label={ro.dashboard.budgetUsed}
        value={formatBudgetValue(summary.budget.spent, summary.budget.total)}
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
  );
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

  const summary = statsEvent ? await getDashboardSummary(statsEvent.id) : null;
  const listStats = await getEventListStats(events.map((event) => event.id));

  const focusDays = statsEvent ? getDaysUntil(statsEvent.event_date) : null;
  const primaryDays = primaryEvent ? getDaysUntil(primaryEvent.event_date) : null;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  const firstName = fullName?.split(" ")[0]?.split("@")[0] ?? ro.dashboard.defaultName;
  const hasActiveEvent = Boolean(statsEvent && summary);
  const showEventList = events.length > 1;

  return (
    <DashboardPage
      header={
        hasActiveEvent && statsEvent ? (
          <PageHeader
            title={statsEvent.title}
            description={
              focusDays != null
                ? `${formatDaysUntil(focusDays)} · ${ro.dashboard.description}`
                : ro.dashboard.description
            }
            className="[&_h1]:text-[2.25rem] [&_h1]:font-bold"
          />
        ) : (
          <PageHeader
            title={`${ro.dashboard.welcome}, ${firstName}`}
            description={ro.dashboard.description}
            className="[&_h1]:text-[2.25rem] [&_h1]:font-bold"
          />
        )
      }
      stats={
        hasActiveEvent && summary && statsEvent ? (
          <ActiveEventStats
            eventsCount={events.length}
            daysUntil={focusDays}
            eventTitle={statsEvent.title}
            eventId={statsEvent.id}
            summary={summary}
          />
        ) : !hasActiveEvent && events.length > 0 ? (
          <DashboardStatsMotion
            eventsCount={events.length}
            daysUntil={primaryDays}
            primaryEventTitle={primaryEvent?.title ?? null}
            eventsCountLabel={ro.dashboard.eventsCount}
            eventsCountDesc={ro.dashboard.eventsCountDesc}
            daysToGoLabel={ro.dashboard.daysToGo}
            daysToGoDesc={ro.dashboard.daysToGoDesc}
            icon={CalendarHeart}
          />
        ) : null
      }
    >
      {events.length === 0 ? (
        <OnboardingChecklist />
      ) : (
        <>
          {hasActiveEvent && summary && statsEvent ? (
            <DashboardFocus
              eventId={statsEvent.id}
              eventTitle={statsEvent.title}
              daysUntil={focusDays}
              summary={summary}
            />
          ) : null}

          {showEventList ? (
            <section className="pt-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold tracking-tight text-[var(--dash-text)]">
                  {ro.dashboard.yourEvents}
                </h2>
                <Button
                  variant="ghost"
                  className="min-h-11 text-xs font-semibold text-[var(--dash-text-secondary)]"
                  asChild
                >
                  <Link href="/dashboard/events">{ro.dashboard.viewAll}</Link>
                </Button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 3).map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    stats={listStats[event.id]}
                    isActive={activeEventId === event.id}
                    index={index}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </DashboardPage>
  );
}
