"use server";

import { revalidatePath } from "next/cache";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { isVendorFoundationSchemaMissing } from "@/lib/vendors/migration";
import type { VendorActionResult } from "@/lib/vendors/validation";
import { createClient } from "@/lib/supabase/server";

const SERVICE_MIGRATION_HINT =
  "Rulează migrarea 022_event_vendor_services.sql în Supabase.";

function revalidateVendors(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/vendors`);
}

export async function createVendorService(
  eventId: string,
  categorySlug: string,
  name: string
): Promise<VendorActionResult> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditVendors,
    "canEditVendors"
  );
  if (accessDenied) return accessDenied;

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { error: "Numele serviciului este prea scurt." };
  }

  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("event_vendor_services")
    .select("sort_order")
    .eq("event_id", eventId)
    .eq("category_slug", categorySlug)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 10;

  const { data, error } = await supabase
    .from("event_vendor_services")
    .insert({
      event_id: eventId,
      category_slug: categorySlug,
      name: trimmed,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) {
      return { error: SERVICE_MIGRATION_HINT };
    }
    console.error("createVendorService:", error);
    return { error: "Nu am putut crea serviciul." };
  }

  revalidateVendors(eventId);
  return { success: true, id: data.id as string };
}

export async function deleteVendorService(
  eventId: string,
  serviceId: string
): Promise<VendorActionResult> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canManageVendors,
    "canManageVendors"
  );
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_vendor_services")
    .delete()
    .eq("id", serviceId)
    .eq("event_id", eventId);

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) {
      return { error: SERVICE_MIGRATION_HINT };
    }
    console.error("deleteVendorService:", error);
    return { error: "Nu am putut șterge serviciul." };
  }

  revalidateVendors(eventId);
  return { success: true };
}
