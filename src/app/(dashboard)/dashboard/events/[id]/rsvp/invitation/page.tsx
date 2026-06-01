import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { InvitationBuilder } from "@/components/invitation/invitation-builder";
import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { getInvitationBuilderState, checkInvitationTableReady } from "@/lib/invitation/queries";
import { requireEventAccess } from "@/lib/events/verify-event";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editor invitație | Evento",
};

type InvitationEditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvitationEditorPage({
  params,
}: InvitationEditorPageProps) {
  const { id } = await params;
  const { event } = await requireEventAccess(id);
  const [builderState, storageReady] = await Promise.all([
    getInvitationBuilderState(id),
    checkInvitationTableReady(),
  ]);

  if (!builderState) {
    notFound();
  }

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <DashboardHeader
          title={ro.invitationBuilder.title}
          description={`${event.title} · ${ro.invitationBuilder.subtitle}`}
        />
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link href={`/dashboard/events/${id}/rsvp`}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            {ro.invitationBuilder.backToRsvp}
          </Link>
        </Button>
      </div>

      {!storageReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ro.rsvp.errors.invitationMissing}
        </div>
      )}

      <InvitationBuilder
        eventId={id}
        eventTitle={event.title}
        eventType={event.event_type}
        rsvpSlug={event.rsvp_slug}
        initialState={builderState}
        storageReady={storageReady}
      />
    </AnimatedPage>
  );
}
