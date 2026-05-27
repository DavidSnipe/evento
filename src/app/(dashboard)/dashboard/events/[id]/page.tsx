import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Pencil, Users, UtensilsCrossed } from "lucide-react";

import { setActiveEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AnimatedPage } from "@/components/layout/animated-page";
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
    <AnimatedPage>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DashboardHeader
          title={event.title}
          description={getEventTypeLabel(event.event_type)}
        />
        <div className="flex flex-wrap gap-2 items-center -mt-2">
          {!isActive ? (
            <form action={setActiveEvent.bind(null, event.id)}>
              <Button type="submit" variant="secondary" className="h-9 text-xs">
                {ro.events.detail.setActive}
              </Button>
            </form>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border border-border-rose-18 px-3.5 py-2 text-xs font-bold text-[#B8516B]">
              <span className="h-1.5 w-1.5 rounded-full bg-confirmed-green animate-pulse" />
              {ro.events.detail.active}
            </span>
          )}
          <Button variant="outline" className="h-9 text-xs" asChild>
            <Link href={`/dashboard/events/${event.id}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
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
        {/* Days To Go Card */}
        <Card className="glass-panel border-0 p-5 md:col-span-1">
          <CardTitle className="text-base text-[#1A0E14]">{ro.dashboard.daysToGo}</CardTitle>
          <div className="mt-4">
            <p className="font-sans text-4xl font-bold text-[#1A0E14]">{formatDaysUntil(days)}</p>
            <CardDescription className="mt-2 text-xs text-text-secondary">
              {formatEventDate(event.event_date) ?? ro.events.detail.noDate}
            </CardDescription>
          </div>
        </Card>

        {/* Overview Details Card */}
        <Card className="glass-panel border-0 p-5 md:col-span-2">
          <CardTitle className="text-base text-[#1A0E14]">{ro.events.detail.overview}</CardTitle>
          <div className="mt-4 space-y-3.5 text-xs text-text-secondary">
            <p className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-subtle" />
              {formatEventDate(event.event_date) ?? ro.events.detail.noDate}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-subtle" />
              {event.venue ?? ro.events.detail.noVenue}
            </p>
            <p className="leading-relaxed text-text-secondary mt-1 text-[13px] bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              {event.description ?? ro.events.detail.noDescription}
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Guests Quick Link */}
        <Link
          href={`/dashboard/events/${id}/guests`}
          className="glass-panel hover-lift bg-white flex items-center gap-4 p-5 transition border border-[rgba(210,170,185,0.22)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border border-border-rose-18 text-[#B8516B] shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-[#1A0E14]">{ro.events.subNav.guests}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {guestStats.total} invitați · {guestStats.accepted} confirmați
            </p>
          </div>
        </Link>

        {/* Seating Quick Link */}
        <Link
          href={`/dashboard/events/${id}/seating`}
          className="glass-panel hover-lift bg-white flex items-center gap-4 p-5 transition border border-[rgba(210,170,185,0.22)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border border-border-rose-18 text-[#B8516B] shadow-sm">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-[#1A0E14]">{ro.events.subNav.seating}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {seating.tables.length} mese · {seating.unassigned.length} fără masă
            </p>
          </div>
        </Link>
      </div>
    </AnimatedPage>
  );
}
