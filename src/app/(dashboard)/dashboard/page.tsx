import Link from "next/link";
import { CalendarHeart, Plus, Users } from "lucide-react";

import { EventCard } from "@/components/events/event-card";
import { DashboardPage } from "@/components/layout/animated-page";
import { PageHeader } from "@/components/nuntiki/page-header";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { StatsGrid } from "@/components/nuntiki/stats-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reconcileActiveEventAccess } from "@/lib/events/active-event-access";
import { getPrimaryEvent, getUserEvents } from "@/lib/events/queries";
import { formatDaysUntil, getDaysUntil } from "@/lib/events/utils";
import { getGuestStats } from "@/lib/guests/queries";
import { ro } from "@/lib/i18n/ro";
import { getServerUser } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

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
  const guestStats = statsEvent ? await getGuestStats(statsEvent.id) : null;
  const days = primaryEvent ? getDaysUntil(primaryEvent.event_date) : null;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  const firstName = fullName?.split(" ")[0]?.split("@")[0] ?? ro.dashboard.defaultName;
  const recentEvents = events.slice(0, 3);

  return (
    <DashboardPage
      header={
        <PageHeader
          title={`${ro.dashboard.welcome}, ${firstName}`}
          description={ro.dashboard.description}
        />
      }
      stats={
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
      }
    >
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[1.125rem] font-semibold tracking-[-0.012em] text-[var(--dash-text)]">
            {ro.dashboard.yourEvents}
          </h2>
          {events.length > 0 ? (
            <Button
              variant="ghost"
              className="text-xs font-semibold text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
              asChild
            >
              <Link href="/dashboard/events">{ro.dashboard.viewAll}</Link>
            </Button>
          ) : null}
        </div>

        {events.length === 0 ? (
          <Card className="rounded-[18px] border border-dashed border-border-rose-18/40 bg-white/40 shadow-none">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-[var(--dash-text-secondary)]">{ro.dashboard.noEventsYet}</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/events/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  {ro.dashboard.createFirst}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
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
        )}
      </section>
    </DashboardPage>
  );
}
