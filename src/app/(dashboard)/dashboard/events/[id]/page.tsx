import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Pencil, Users, UtensilsCrossed } from "lucide-react";

import { setActiveEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveEventId } from "@/lib/events/active-event";
import { getEventTypeLabel } from "@/lib/events/config";
import { getEventById } from "@/lib/events/queries";
import { getGuestStats } from "@/lib/guests/queries";
import { getSeatingPlan } from "@/lib/seating/queries";
import {
  formatDaysUntil,
  formatEventDate,
  getDaysUntil,
} from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const [event, activeEventId] = await Promise.all([getEventById(id), getActiveEventId()]);

  if (!event) notFound();

  const days = getDaysUntil(event.event_date);
  const isActive = activeEventId === event.id;
  const [guestStats, seating] = await Promise.all([
    getGuestStats(id),
    getSeatingPlan(id),
  ]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <DashboardHeader
          title={event.title}
          description={getEventTypeLabel(event.event_type)}
        />
        <div className="flex flex-wrap gap-2">
          {!isActive ? (
            <form action={setActiveEvent.bind(null, event.id)}>
              <Button type="submit" variant="secondary">
                {ro.events.detail.setActive}
              </Button>
            </form>
          ) : (
            <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary">
              {ro.events.detail.active}
            </span>
          )}
          <Button variant="outline" asChild>
            <Link href={`/dashboard/events/${event.id}/edit`}>
              <Pencil className="h-4 w-4" />
              {ro.events.detail.edit}
            </Link>
          </Button>
          <DeleteEventButton eventId={event.id} />
        </div>
      </div>

      {error === "delete" ? (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ro.events.errors.deleteFailed}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-panel border-0 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{ro.dashboard.daysToGo}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-4xl font-semibold">{formatDaysUntil(days)}</p>
            <CardDescription className="mt-2">
              {formatEventDate(event.event_date) ?? ro.events.detail.noDate}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{ro.events.detail.overview}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="flex items-start gap-2 text-muted-foreground">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
              {formatEventDate(event.event_date) ?? ro.events.detail.noDate}
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {event.venue ?? ro.events.detail.noVenue}
            </p>
            <p className="leading-relaxed text-foreground/90">
              {event.description ?? ro.events.detail.noDescription}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/dashboard/events/${id}/guests`}
          className="glass-panel flex items-center gap-4 p-6 transition hover:shadow-lg"
        >
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="font-serif text-lg font-semibold">{ro.events.subNav.guests}</p>
            <p className="text-sm text-muted-foreground">
              {guestStats.total} invitați · {guestStats.accepted} confirmați
            </p>
          </div>
        </Link>
        <Link
          href={`/dashboard/events/${id}/seating`}
          className="glass-panel flex items-center gap-4 p-6 transition hover:shadow-lg"
        >
          <UtensilsCrossed className="h-8 w-8 text-accent" />
          <div>
            <p className="font-serif text-lg font-semibold">{ro.events.subNav.seating}</p>
            <p className="text-sm text-muted-foreground">
              {seating.tables.length} mese · {seating.unassigned.length} fără masă
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}
