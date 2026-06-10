import Link from "next/link";

import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { CollaboratorsManager } from "@/components/collaboration/collaborators-manager";
import { EventSettingsNav } from "@/components/collaboration/event-settings-nav";
import { Button } from "@/components/ui/button";
import { canManageCollaborators } from "@/lib/collaboration/permissions";
import {
  checkCollaborationReady,
  getEventMembers,
} from "@/lib/collaboration/queries";
import { getEventAccessContext } from "@/lib/events/verify-event";
import { getServerUser } from "@/lib/supabase/server-auth";
import { getSiteUrl } from "@/lib/supabase/site-url";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Colaboratori | Evento",
};

type CollaboratorsSettingsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CollaboratorsSettingsPage({
  params,
}: CollaboratorsSettingsPageProps) {
  const { id } = await params;
  const [{ event, access }, migrationReady, user, inviteBaseUrl] = await Promise.all([
    getEventAccessContext(id),
    checkCollaborationReady(),
    getServerUser(),
    getSiteUrl(),
  ]);

  const members = await getEventMembers(event, user?.email ?? null);

  const canManage = canManageCollaborators(access);

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <DashboardHeader
          title={ro.collaboration.settingsTitle}
          description={`${event.title} · ${ro.collaboration.settingsSubtitle}`}
        />
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href={`/dashboard/events/${id}`}>
            {ro.collaboration.backToEvent}
          </Link>
        </Button>
      </div>

      <EventSettingsNav eventId={id} />

      {!migrationReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ro.collaboration.errors.migrationMissing}
        </div>
      )}

      {migrationReady && (
        <CollaboratorsManager
          eventId={id}
          initialMembers={members}
          inviteBaseUrl={inviteBaseUrl}
          canManage={canManage}
        />
      )}

      {!canManage && migrationReady && (
        <p className="text-sm text-text-secondary">{ro.collaboration.viewOnlyHint}</p>
      )}
    </AnimatedPage>
  );
}
