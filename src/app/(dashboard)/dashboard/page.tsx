import Link from "next/link";
import { CalendarHeart, CircleDollarSign, Plus, Users } from "lucide-react";

import { EventCard } from "@/components/events/event-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveEventId } from "@/lib/events/active-event";
import { getPrimaryEvent, getUserEvents } from "@/lib/events/queries";
import { formatDaysUntil, getDaysUntil } from "@/lib/events/utils";
import { getGuestStats } from "@/lib/guests/queries";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [events, activeEventId] = await Promise.all([getUserEvents(), getActiveEventId()]);
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
    <>
      <DashboardHeader
        title={`${ro.dashboard.welcome}, ${firstName}`}
        description={ro.dashboard.description}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-panel border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">{ro.dashboard.eventsCount}</CardTitle>
            <CalendarHeart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-semibold">{events.length}</p>
            <CardDescription className="mt-1">{ro.dashboard.eventsCountDesc}</CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">{ro.dashboard.daysToGo}</CardTitle>
            <CalendarHeart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-semibold">{formatDaysUntil(days)}</p>
            <CardDescription className="mt-1">
              {primaryEvent?.title ?? ro.dashboard.daysToGoDesc}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">{ro.dashboard.guests}</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-semibold">
              {guestStats?.total ?? "—"}
            </p>
            <CardDescription className="mt-1">
              {statsEvent
                ? `${guestStats?.accepted ?? 0} ${ro.guests.stats.accepted.toLowerCase()}`
                : ro.dashboard.guestsDesc}
            </CardDescription>
            {statsEvent ? (
              <Button variant="link" className="mt-2 h-auto p-0" asChild>
                <Link href={`/dashboard/events/${statsEvent.id}/guests`}>
                  {ro.dashboard.viewAll}
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold">{ro.dashboard.yourEvents}</h2>
          {events.length > 0 ? (
            <Button variant="ghost" asChild>
              <Link href="/dashboard/events">{ro.dashboard.viewAll}</Link>
            </Button>
          ) : null}
        </div>

        {events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-muted-foreground">{ro.dashboard.noEventsYet}</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/events/new">
                  <Plus className="h-4 w-4" />
                  {ro.dashboard.createFirst}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isActive={activeEventId === event.id}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
