"use server";

import { revalidatePath } from "next/cache";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { isVendorFoundationSchemaMissing } from "@/lib/vendors/migration";
import { createClient } from "@/lib/supabase/server";

export type AddMarketplaceVendorResult = {
  ok: boolean;
  error?: string;
  vendorId?: string;
  vendorsUrl?: string;
};

const MIGRATION_HINT =
  "Rulează migrarea 030_vendors_marketplace_link.sql în Supabase.";

export async function addMarketplaceVendorToEvent(
  eventId: string,
  marketplaceVendorId: string
): Promise<AddMarketplaceVendorResult> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditVendors,
    "canEditVendors"
  );
  if (accessDenied) return { ok: false, error: accessDenied.error };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("vendors")
    .select("id")
    .eq("event_id", eventId)
    .eq("marketplace_vendor_id", marketplaceVendorId)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "Furnizorul este deja adăugat la acest eveniment.",
      vendorsUrl: `/dashboard/events/${eventId}/vendors`,
    };
  }

  const { data: marketplaceVendor, error: vendorError } = await supabase
    .from("marketplace_vendors")
    .select(
      "id, name, slug, website, email, phone, is_published, marketplace_vendor_categories(category_slug, is_primary), marketplace_vendor_packages(id, name, description, price_from, price_currency, sort_order)"
    )
    .eq("id", marketplaceVendorId)
    .eq("is_published", true)
    .maybeSingle();

  if (vendorError || !marketplaceVendor) {
    if (vendorError) console.error("[addMarketplaceVendorToEvent]", vendorError);
    return { ok: false, error: "Furnizorul nu este disponibil." };
  }

  const categories = (marketplaceVendor.marketplace_vendor_categories ?? []) as {
    category_slug: string;
    is_primary: boolean;
  }[];
  const primaryCategory =
    categories.find((c) => c.is_primary)?.category_slug ??
    categories[0]?.category_slug ??
    "other";

  const { error: categoryError } = await supabase.from("event_vendor_categories").upsert(
    { event_id: eventId, category_slug: primaryCategory },
    { onConflict: "event_id,category_slug" }
  );

  if (categoryError && !isVendorFoundationSchemaMissing(categoryError)) {
    console.error("[addMarketplaceVendorToEvent] category:", categoryError);
    return { ok: false, error: "Nu am putut activa categoria." };
  }

  const { data: maxService } = await supabase
    .from("event_vendor_services")
    .select("sort_order")
    .eq("event_id", eventId)
    .eq("category_slug", primaryCategory)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const serviceSortOrder = (maxService?.sort_order ?? 0) + 10;

  const { data: service, error: serviceError } = await supabase
    .from("event_vendor_services")
    .insert({
      event_id: eventId,
      category_slug: primaryCategory,
      name: marketplaceVendor.name as string,
      sort_order: serviceSortOrder,
    })
    .select("id")
    .single();

  if (serviceError || !service) {
    if (isVendorFoundationSchemaMissing(serviceError)) {
      return { ok: false, error: MIGRATION_HINT };
    }
    console.error("[addMarketplaceVendorToEvent] service:", serviceError);
    return { ok: false, error: "Nu am putut crea serviciul." };
  }

  const vendorRow: Record<string, unknown> = {
    event_id: eventId,
    name: marketplaceVendor.name,
    category: primaryCategory,
    category_id: primaryCategory,
    service_id: service.id,
    website: marketplaceVendor.website,
    email: marketplaceVendor.email,
    phone: marketplaceVendor.phone,
    status: "researching",
    marketplace_vendor_id: marketplaceVendorId,
  };

  const { data: eventVendor, error: insertError } = await supabase
    .from("vendors")
    .insert(vendorRow)
    .select("id")
    .single();

  if (insertError || !eventVendor) {
    if (isVendorFoundationSchemaMissing(insertError)) {
      delete vendorRow.marketplace_vendor_id;
      const legacy = await supabase
        .from("vendors")
        .insert({
          event_id: eventId,
          name: marketplaceVendor.name,
          category: primaryCategory,
          category_id: primaryCategory,
          service_id: service.id,
          status: "researching",
        })
        .select("id")
        .single();
      if (legacy.error) {
        return { ok: false, error: MIGRATION_HINT };
      }
      revalidatePath(`/dashboard/events/${eventId}/vendors`);
      revalidatePath("/dashboard/marketplace");
      return {
        ok: true,
        vendorId: legacy.data.id as string,
        vendorsUrl: `/dashboard/events/${eventId}/vendors`,
      };
    }
    console.error("[addMarketplaceVendorToEvent] vendor:", insertError);
    return { ok: false, error: "Nu am putut adăuga furnizorul." };
  }

  const packages = (marketplaceVendor.marketplace_vendor_packages ?? []) as {
    id: string;
    name: string;
    description: string | null;
    price_from: number | null;
    price_currency: string;
    sort_order: number;
  }[];

  if (packages.length > 0) {
    const offerRows = packages.map((pkg, index) => ({
      vendor_id: eventVendor.id,
      event_id: eventId,
      title: pkg.name,
      price: pkg.price_from,
      currency: pkg.price_currency || "RON",
      description: pkg.description,
      sort_order: pkg.sort_order ?? index,
    }));

    const { error: offersError } = await supabase.from("vendor_offers").insert(offerRows);
    if (offersError && !isVendorFoundationSchemaMissing(offersError)) {
      console.error("[addMarketplaceVendorToEvent] offers:", offersError);
    }
  }

  revalidatePath(`/dashboard/events/${eventId}/vendors`);
  revalidatePath("/dashboard/marketplace");

  return {
    ok: true,
    vendorId: eventVendor.id as string,
    vendorsUrl: `/dashboard/events/${eventId}/vendors`,
  };
}
