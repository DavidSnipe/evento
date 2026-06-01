import { notFound } from "next/navigation";

import { updateEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { EventForm } from "@/components/events/event-form";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AnimatedPage } from "@/components/layout/animated-page";
import { requireEventPermission } from "@/lib/events/verify-event";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const { event } = await requireEventPermission(id, (p) => p.canDeleteEvent);

  const supabase = await createClient();
  const { data: existingGuests } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", id);

  const godparents = existingGuests?.filter(g => g.tags?.includes("godparents")) ?? [];
  const existingGodfather = godparents.find(g => !g.parent_id);
  const existingGodmother = godparents.find(g => g.parent_id);

  const initialGodfatherName = existingGodfather
    ? [existingGodfather.last_name, existingGodfather.first_name].filter(Boolean).join(" ")
    : "";
  const initialGodmotherName = existingGodmother
    ? [existingGodmother.last_name, existingGodmother.first_name].filter(Boolean).join(" ")
    : "";

  const updateEventWithId = updateEvent.bind(null, id);

  return (
    <AnimatedPage>
      <DashboardHeader
        title={ro.events.editTitle}
        description={ro.events.editSubtitle}
      />
      <div className="mx-auto max-w-2xl">
        <EventForm
          mode="edit"
          event={event}
          action={updateEventWithId}
          initialGodfatherName={initialGodfatherName}
          initialGodmotherName={initialGodmotherName}
        />
      </div>
    </AnimatedPage>
  );
}
