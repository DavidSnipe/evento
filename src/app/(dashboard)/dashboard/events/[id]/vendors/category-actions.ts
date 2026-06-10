"use server";

import { revalidatePath } from "next/cache";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { slugifyCategoryName } from "@/lib/vendors/category-display";
import { isVendorFoundationSchemaMissing } from "@/lib/vendors/migration";
import type { VendorActionResult } from "@/lib/vendors/validation";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_MIGRATION_HINT =
  "Rulează migrările 020 și 021 în Supabase (categorii personalizate și activare pe eveniment).";

function revalidateVendors(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/vendors`);
}

async function activateCategoryForEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  categorySlug: string
): Promise<VendorActionResult> {
  const { error } = await supabase.from("event_vendor_categories").upsert(
    { event_id: eventId, category_slug: categorySlug },
    { onConflict: "event_id,category_slug" }
  );

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) {
      return { error: CATEGORY_MIGRATION_HINT };
    }
    console.error("activateCategoryForEvent:", error);
    return { error: "Nu am putut activa categoria." };
  }

  return { success: true, id: categorySlug };
}

export async function activateVendorCategory(
  eventId: string,
  categorySlug: string
): Promise<VendorActionResult> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canManageVendors,
    "canManageVendors"
  );
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("vendor_categories")
    .select("slug")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) {
    return { error: "Categoria nu există în catalog." };
  }

  const result = await activateCategoryForEvent(supabase, eventId, categorySlug);
  if (result.error) return result;

  revalidateVendors(eventId);
  return result;
}

export async function createVendorCategory(
  eventId: string,
  displayName: string
): Promise<VendorActionResult> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canManageVendors,
    "canManageVendors"
  );
  if (accessDenied) return accessDenied;

  const name = displayName.trim();
  if (name.length < 2) {
    return { error: "Numele categoriei este prea scurt." };
  }

  const supabase = await createClient();
  const slug = slugifyCategoryName(name);

  const { data: existing } = await supabase
    .from("vendor_categories")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!existing) {
    const { data: maxRow } = await supabase
      .from("vendor_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (maxRow?.sort_order ?? 0) + 10;

    const { error } = await supabase.from("vendor_categories").insert({
      slug,
      label_key: name,
      sort_order: sortOrder,
      is_system: false,
    });

    if (error) {
      if (isVendorFoundationSchemaMissing(error)) {
        return { error: "Migrarea vendor foundation lipsește." };
      }
      console.error("createVendorCategory:", error);
      return { error: CATEGORY_MIGRATION_HINT };
    }
  }

  const activated = await activateCategoryForEvent(supabase, eventId, slug);
  if (activated.error) return activated;

  revalidateVendors(eventId);
  return { success: true, id: slug };
}

/** Removes category from event only; catalog entry stays (incl. custom). */
export async function removeVendorCategoryFromEvent(
  eventId: string,
  categorySlug: string
): Promise<VendorActionResult & { deletedVendors?: number }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canManageVendors,
    "canManageVendors"
  );
  if (accessDenied) return accessDenied;

  const supabase = await createClient();

  const { data: vendors, error: listError } = await supabase
    .from("vendors")
    .select("id")
    .eq("event_id", eventId)
    .eq("category_id", categorySlug);

  if (listError) {
    console.error("removeVendorCategoryFromEvent:", listError);
    return { error: "Nu am putut citi serviciile." };
  }

  const ids = (vendors ?? []).map((v) => v.id as string);
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from("vendors")
      .delete()
      .eq("event_id", eventId)
      .eq("category_id", categorySlug);

    if (deleteError) {
      console.error("removeVendorCategoryFromEvent vendors:", deleteError);
      return { error: "Nu am putut șterge serviciile din categorie." };
    }
  }

  const { error: unlinkError } = await supabase
    .from("event_vendor_categories")
    .delete()
    .eq("event_id", eventId)
    .eq("category_slug", categorySlug);

  if (unlinkError && !isVendorFoundationSchemaMissing(unlinkError)) {
    console.error("removeVendorCategoryFromEvent unlink:", unlinkError);
    return { error: CATEGORY_MIGRATION_HINT };
  }

  const { error: servicesError } = await supabase
    .from("event_vendor_services")
    .delete()
    .eq("event_id", eventId)
    .eq("category_slug", categorySlug);

  if (servicesError && !isVendorFoundationSchemaMissing(servicesError)) {
    console.error("removeVendorCategoryFromEvent services:", servicesError);
  }

  revalidateVendors(eventId);
  return { success: true, deletedVendors: ids.length };
}

/** @deprecated Use removeVendorCategoryFromEvent */
export const deleteVendorCategoryForEvent = removeVendorCategoryFromEvent;
