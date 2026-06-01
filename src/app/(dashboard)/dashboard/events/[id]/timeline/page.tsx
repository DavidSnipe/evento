import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { TimelinePlanner } from "@/components/timeline/timeline-planner";
import { TimelineModeNav } from "@/components/timeline/timeline-mode-nav";
import { requireEventAccess } from "@/lib/events/verify-event";
import { checkTimelineReady, getTimelineFoundation } from "@/lib/timeline/queries";
import { buildCalendarSubscriptionUrls } from "@/lib/calendar/subscription";
import { getEventCalendarSubscriptionToken } from "@/lib/calendar/subscription-queries";
import { getSiteUrl } from "@/lib/supabase/site-url";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cronologie | Evento",
};

type TimelinePageProps = {
  params: Promise<{ id: string }>;
};

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { id } = await params;
  const { event } = await requireEventAccess(id);
  const migrationReady = await checkTimelineReady();

  const foundation = migrationReady
    ? await getTimelineFoundation(id)
    : {
        categories: [],
        milestoneTemplates: [],
        eventMilestones: [],
        tasks: [],
      };

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
        title={ro.timeline.title}
        description={`${event.title} · ${ro.timeline.subtitle}`}
      />

      <TimelineModeNav eventId={id} />

      {!migrationReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ro.timeline.errors.migrationMissing}
        </div>
      )}

      {migrationReady && (
        <TimelinePlanner
          eventId={id}
          eventTitle={event.title}
          eventDate={event.event_date}
          eventVenue={event.venue}
          subscriptionUrls={subscriptionUrls}
          categories={foundation.categories}
          milestoneTemplates={foundation.milestoneTemplates}
          eventMilestones={foundation.eventMilestones}
          initialTasks={foundation.tasks}
        />
      )}
    </AnimatedPage>
  );
}
