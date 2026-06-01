"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

import { isCalendarSubscriptionColumnMissing } from "@/lib/calendar/subscription-queries";
import { assertEventPermission } from "@/lib/events/assert-event-access";
import { createClient } from "@/lib/supabase/server";

export type CalendarSettingsActionResult = {
  error?: string;
  success?: boolean;
  token?: string;
};

const MIGRATION_HINT =
  "Rulează migrarea 017_calendar_subscription.sql în Supabase (SQL Editor).";

export async function regenerateCalendarSubscriptionToken(
  eventId: string
): Promise<CalendarSettingsActionResult> {
  const auth = await assertEventPermission(
    eventId,
    (p) => p.canDeleteEvent,
    "canDeleteEvent"
  );
  if (!auth.ok) return { error: auth.error };

  const newToken = randomUUID();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ calendar_subscription_token: newToken })
    .eq("id", eventId)
    .select("calendar_subscription_token")
    .single();

  if (error) {
    if (isCalendarSubscriptionColumnMissing(error)) {
      return { error: MIGRATION_HINT };
    }
    console.error("regenerateCalendarSubscriptionToken:", error);
    return { error: "Nu am putut regenera linkul de abonament." };
  }

  revalidatePath(`/dashboard/events/${eventId}/settings/calendar`);
  revalidatePath(`/dashboard/events/${eventId}/timeline`);
  revalidatePath(`/dashboard/events/${eventId}/timeline/day`);

  return { success: true, token: data.calendar_subscription_token as string };
}
