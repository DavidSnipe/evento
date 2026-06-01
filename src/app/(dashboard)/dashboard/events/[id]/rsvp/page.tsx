import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { RsvpDashboard } from "@/components/rsvp/rsvp-dashboard";
import { requireEventAccess } from "@/lib/events/verify-event";
import { getRsvpOverviewStats } from "@/lib/rsvp/public-queries";
import { getHouseholdBundlesByEvent } from "@/lib/rsvp/queries";
import { createClient } from "@/lib/supabase/server";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "RSVP | Evento",
};

type RsvpPageProps = {
  params: Promise<{ id: string }>;
};

async function rsvpReady(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("invitation_households").select("id").limit(1);
  if (!error) return true;
  if (error.code === "42P01" || error.message.includes("does not exist")) {
    return false;
  }
  return true;
}

export default async function RsvpPage({ params }: RsvpPageProps) {
  const { id } = await params;
  const { event } = await requireEventAccess(id);

  const migrationReady = await rsvpReady();
  const rsvpSlug = event.rsvp_slug ?? null;

  const [stats, households] = migrationReady
    ? await Promise.all([
        getRsvpOverviewStats(id),
        getHouseholdBundlesByEvent(id),
      ])
    : [
        {
          householdCount: 0,
          memberCount: 0,
          confirmed: 0,
          declined: 0,
          maybe: 0,
          pending: 0,
          partialHouseholds: 0,
        },
        [],
      ] as const;

  return (
    <AnimatedPage className="space-y-6">
      <DashboardHeader
        title={ro.rsvp.title}
        description={`${event.title} · ${ro.rsvp.subtitle}`}
      />

      {!migrationReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ro.rsvp.errors.tablesMissing}
        </div>
      )}

      {migrationReady && (
        <RsvpDashboard
          eventId={id}
          eventTitle={event.title}
          rsvpSlug={rsvpSlug}
          stats={stats}
          households={households}
        />
      )}
    </AnimatedPage>
  );
}
