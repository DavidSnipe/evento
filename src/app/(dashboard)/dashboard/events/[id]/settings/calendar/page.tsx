import Link from "next/link";

import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { CalendarSubscriptionSettings } from "@/components/calendar/calendar-subscription-settings";
import { EventSettingsNav } from "@/components/collaboration/event-settings-nav";
import { Button } from "@/components/ui/button";
import { buildCalendarSubscriptionUrls } from "@/lib/calendar/subscription";
import { getEventCalendarSubscriptionToken } from "@/lib/calendar/subscription-queries";
import { canDeleteEvent } from "@/lib/collaboration/permissions";
import { requireEventAccess } from "@/lib/events/verify-event";
import { ro } from "@/lib/i18n/ro";
import { getSiteUrl } from "@/lib/supabase/site-url";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar | Evento",
};

type CalendarSettingsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CalendarSettingsPage({ params }: CalendarSettingsPageProps) {
  const { id } = await params;
  const { event, access } = await requireEventAccess(id);
  const [token, siteUrl] = await Promise.all([
    getEventCalendarSubscriptionToken(id),
    getSiteUrl(),
  ]);

  const canManage = canDeleteEvent(access);

  if (!token) {
    return (
      <AnimatedPage className="space-y-6">
        <DashboardHeader
          title={ro.calendar.subscription.settingsTitle}
          description={`${event.title} · ${ro.calendar.subscription.settingsSubtitle}`}
        />
        <EventSettingsNav eventId={id} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ro.calendar.subscription.migrationMissing}
        </div>
      </AnimatedPage>
    );
  }

  const { httpsUrl, webcalUrl } = buildCalendarSubscriptionUrls(siteUrl, id, token);

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <DashboardHeader
          title={ro.calendar.subscription.settingsTitle}
          description={`${event.title} · ${ro.calendar.subscription.settingsSubtitle}`}
        />
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href={`/dashboard/events/${id}`}>{ro.collaboration.backToEvent}</Link>
        </Button>
      </div>

      <EventSettingsNav eventId={id} />

      <CalendarSubscriptionSettings
        eventId={id}
        httpsUrl={httpsUrl}
        webcalUrl={webcalUrl}
        canManage={canManage}
      />
    </AnimatedPage>
  );
}
