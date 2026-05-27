import Link from "next/link";
import { CalendarHeart, Plus, Users } from "lucide-react";

import { EventCard } from "@/components/events/event-card";
import { AnimatedPage } from "@/components/layout/animated-page";
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
    <AnimatedPage className="space-y-6">
      <DashboardHeader
        title={`${ro.dashboard.welcome}, ${firstName}`}
        description={ro.dashboard.description}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Events Count Widget */}
        <Card className="glass-panel border-0 p-5 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] uppercase font-bold tracking-wider text-text-subtle">{ro.dashboard.eventsCount}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8748A] to-[#B8516B] text-white shadow-[0_2px_8px_rgba(184,81,107,0.2)]">
              <CalendarHeart className="h-4 w-4 fill-white/10" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-sans text-2xl font-bold text-[#1A0E14]">{events.length}</p>
            <p className="text-[11.5px] text-text-secondary mt-1">{ro.dashboard.eventsCountDesc}</p>
          </div>
        </Card>

        {/* Days To Go Widget */}
        <Card className="glass-panel border-0 p-5 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] uppercase font-bold tracking-wider text-text-subtle">{ro.dashboard.daysToGo}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8748A] to-[#B8516B] text-white shadow-[0_2px_8px_rgba(184,81,107,0.2)]">
              <CalendarHeart className="h-4 w-4 fill-white/10" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-sans text-2xl font-bold text-[#1A0E14]">{formatDaysUntil(days)}</p>
            <p className="text-[11.5px] text-text-secondary mt-1 truncate max-w-full">
              {primaryEvent?.title ?? ro.dashboard.daysToGoDesc}
            </p>
          </div>
        </Card>

        {/* Guests Stats Widget */}
        <Card className="glass-panel border-0 p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] uppercase font-bold tracking-wider text-text-subtle">{ro.dashboard.guests}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8748A] to-[#B8516B] text-white shadow-[0_2px_8px_rgba(184,81,107,0.2)]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-sans text-2xl font-bold text-[#1A0E14]">
              {guestStats?.total ?? "—"}
            </p>
            <p className="text-[11.5px] text-text-secondary mt-1">
              {statsEvent
                ? `${guestStats?.accepted ?? 0} ${ro.guests.stats.accepted.toLowerCase()}`
                : ro.dashboard.guestsDesc}
            </p>
            {statsEvent ? (
              <Button variant="link" className="mt-2.5 h-auto p-0 text-xs font-semibold text-[#B8516B] hover:text-[#AA3F58]" asChild>
                <Link href={`/dashboard/events/${statsEvent.id}/guests`}>
                  {ro.dashboard.viewAll}
                </Link>
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-[#1A0E14]">{ro.dashboard.yourEvents}</h2>
          {events.length > 0 ? (
            <Button variant="ghost" className="text-text-secondary hover:text-[#B8516B] text-xs font-semibold" asChild>
              <Link href="/dashboard/events">{ro.dashboard.viewAll}</Link>
            </Button>
          ) : null}
        </div>

        {events.length === 0 ? (
          <Card className="border-dashed border-border-rose-22 bg-white/50 rounded-[18px]">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-text-secondary">{ro.dashboard.noEventsYet}</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/events/new">
                  <Plus className="h-4 w-4 mr-1.5" />
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
    </AnimatedPage>
  );
}
