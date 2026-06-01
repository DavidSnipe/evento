import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DaySchedulePlanner } from "@/components/day-schedule/day-schedule-planner";
import { TimelineModeNav } from "@/components/timeline/timeline-mode-nav";
import { requireEventAccess } from "@/lib/events/verify-event";
import {
  checkDayScheduleReady,
  getDayScheduleItems,
  getEnabledDaySegments,
} from "@/lib/day-schedule/queries";
import { buildCalendarSubscriptionUrls } from "@/lib/calendar/subscription";
import { getEventCalendarSubscriptionToken } from "@/lib/calendar/subscription-queries";
import { getSiteUrl } from "@/lib/supabase/site-url";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Program ziua N | Evento",
};

type DaySchedulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function DaySchedulePage({ params }: DaySchedulePageProps) {
  const { id } = await params;
  const { event } = await requireEventAccess(id);
  const migrationReady = await checkDayScheduleReady();

  const [items, enabledSegments] = migrationReady
    ? await Promise.all([getDayScheduleItems(id), getEnabledDaySegments(id)])
    : [[], { civil: true, religious: true, party: true }];

  const [token, siteUrl] = await Promise.all([
    getEventCalendarSubscriptionToken(id),
    getSiteUrl(),
  ]);
  const subscriptionUrls = token
    ? buildCalendarSubscriptionUrls(siteUrl, id, token)
    : null;

  return (
    <AnimatedPage className="space-y-6">
      <DashboardHeader
        title={ro.daySchedule.title}
        description={`${event.title} · ${ro.daySchedule.subtitle}`}
      />

      <TimelineModeNav eventId={id} />

      {!migrationReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ro.daySchedule.errors.migrationMissing}
        </div>
      )}

      {migrationReady && (
        <DaySchedulePlanner
          eventId={id}
          eventTitle={event.title}
          eventDate={event.event_date}
          eventVenue={event.venue}
          subscriptionUrls={subscriptionUrls}
          initialItems={items}
          enabledSegments={enabledSegments}
        />
      )}
    </AnimatedPage>
  );
}
