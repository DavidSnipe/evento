"use server";

import { revalidatePath } from "next/cache";

import type { MarketplaceVendorSaveInput } from "@/lib/admin/marketplace-vendor-input";
import { isValidMarketplaceSlug } from "@/lib/admin/slug";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createClient } from "@/lib/supabase/server";

export type AdminActionResult = {
  ok: boolean;
  error?: string;
  id?: string;
};

const ADMIN_PATHS = ["/admin", "/admin/vendors", "/admin/reviews", "/admin/requests"];

function revalidateAdmin() {
  for (const path of ADMIN_PATHS) {
    revalidatePath(path);
  }
}

async function refreshVendorReviewStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vendorId: string
) {
  const { data } = await supabase
    .from("marketplace_vendor_reviews")
    .select("rating")
    .eq("vendor_id", vendorId)
    .eq("is_approved", true);

  const ratings = (data ?? []).map((r) => r.rating as number);
  const review_count = ratings.length;
  const review_avg =
    review_count > 0
      ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / review_count) * 100) / 100
      : null;

  await supabase
    .from("marketplace_vendors")
    .update({ review_count, review_avg })
    .eq("id", vendorId);
}

async function syncVendorRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vendorId: string,
  input: MarketplaceVendorSaveInput
) {
  await supabase.from("marketplace_vendor_categories").delete().eq("vendor_id", vendorId);
  if (input.categories.length > 0) {
    await supabase.from("marketplace_vendor_categories").insert(
      input.categories.map((c) => ({
        vendor_id: vendorId,
        category_slug: c.category_slug,
        is_primary: c.is_primary,
      }))
    );
  }

  await supabase.from("marketplace_vendor_packages").delete().eq("vendor_id", vendorId);
  if (input.packages.length > 0) {
    await supabase.from("marketplace_vendor_packages").insert(
      input.packages.map((pkg, index) => ({
        vendor_id: vendorId,
        category_slug: pkg.category_slug,
        name: pkg.name,
        description: pkg.description,
        price_from: pkg.price_from,
        price_to: pkg.price_to,
        price_currency: pkg.price_currency || "RON",
        price_label: pkg.price_label,
        price_is_visible: pkg.price_is_visible,
        sort_order: pkg.sort_order ?? index,
      }))
    );
  }

  await supabase.from("marketplace_vendor_portfolio").delete().eq("vendor_id", vendorId);
  if (input.portfolio.length > 0) {
    await supabase.from("marketplace_vendor_portfolio").insert(
      input.portfolio.map((item, index) => ({
        vendor_id: vendorId,
        url: item.url,
        thumbnail_url: item.thumbnail_url,
        caption: item.caption,
        media_type: item.media_type,
        sort_order: item.sort_order ?? index,
      }))
    );
  }
}

function validateVendorInput(input: MarketplaceVendorSaveInput): string | null {
  if (!input.name.trim()) return "Numele furnizorului este obligatoriu.";
  if (!isValidMarketplaceSlug(input.slug)) {
    return "Slug-ul trebuie să conțină doar litere mici, cifre și cratime.";
  }
  if (input.tagline && input.tagline.length > 100) {
    return "Tagline-ul poate avea maximum 100 de caractere.";
  }
  if (input.categories.length === 0) return "Selectează cel puțin o categorie.";
  const primaryCount = input.categories.filter((c) => c.is_primary).length;
  if (primaryCount !== 1) return "Marchează exact o categorie principală.";
  return null;
}

export async function createMarketplaceVendor(
  input: MarketplaceVendorSaveInput
): Promise<AdminActionResult> {
  await requireAdmin();
  const validationError = validateVendorInput(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_vendors")
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim(),
      tagline: input.tagline?.trim() || null,
      description: input.description?.trim() || null,
      website: input.website?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      location_city: input.location_city?.trim() || null,
      location_county: input.location_county?.trim() || null,
      location_country: input.location_country || "RO",
      is_published: input.is_published,
      is_featured: input.is_featured,
      is_claimed: input.is_claimed,
      owner_id: input.owner_id?.trim() || null,
      logo_url: input.logo_url?.trim() || null,
      cover_image_url: input.cover_image_url?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createMarketplaceVendor]", error);
    return { ok: false, error: error?.message ?? "Nu am putut crea furnizorul." };
  }

  await syncVendorRelations(supabase, data.id, input);
  revalidateAdmin();
  return { ok: true, id: data.id };
}

export async function updateMarketplaceVendor(
  id: string,
  input: MarketplaceVendorSaveInput
): Promise<AdminActionResult> {
  await requireAdmin();
  const validationError = validateVendorInput(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_vendors")
    .update({
      name: input.name.trim(),
      slug: input.slug.trim(),
      tagline: input.tagline?.trim() || null,
      description: input.description?.trim() || null,
      website: input.website?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      location_city: input.location_city?.trim() || null,
      location_county: input.location_county?.trim() || null,
      location_country: input.location_country || "RO",
      is_published: input.is_published,
      is_featured: input.is_featured,
      is_claimed: input.is_claimed,
      owner_id: input.owner_id?.trim() || null,
      logo_url: input.logo_url?.trim() || null,
      cover_image_url: input.cover_image_url?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[updateMarketplaceVendor]", error);
    return { ok: false, error: error.message };
  }

  await syncVendorRelations(supabase, id, input);
  revalidateAdmin();
  revalidatePath(`/admin/vendors/${id}`);
  return { ok: true, id };
}

export async function deleteMarketplaceVendor(id: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("marketplace_vendors").delete().eq("id", id);
  if (error) {
    console.error("[deleteMarketplaceVendor]", error);
    return { ok: false, error: error.message };
  }
  revalidateAdmin();
  return { ok: true };
}

export async function publishVendor(id: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_vendors")
    .update({ is_published: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function unpublishVendor(id: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_vendors")
    .update({ is_published: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function bulkPublishVendors(ids: string[]): Promise<AdminActionResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: false, error: "Niciun furnizor selectat." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_vendors")
    .update({ is_published: true })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function bulkUnpublishVendors(ids: string[]): Promise<AdminActionResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: false, error: "Niciun furnizor selectat." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_vendors")
    .update({ is_published: false })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function bulkDeleteVendors(ids: string[]): Promise<AdminActionResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: false, error: "Niciun furnizor selectat." };
  const supabase = await createClient();
  const { error } = await supabase.from("marketplace_vendors").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function approveReview(reviewId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: review, error: fetchError } = await supabase
    .from("marketplace_vendor_reviews")
    .select("vendor_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (fetchError || !review) {
    return { ok: false, error: fetchError?.message ?? "Recenzia nu a fost găsită." };
  }

  const { error } = await supabase
    .from("marketplace_vendor_reviews")
    .update({ is_approved: true })
    .eq("id", reviewId);

  if (error) return { ok: false, error: error.message };

  await refreshVendorReviewStats(supabase, review.vendor_id as string);
  revalidateAdmin();
  return { ok: true };
}

export async function rejectReview(reviewId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: review } = await supabase
    .from("marketplace_vendor_reviews")
    .select("vendor_id, is_approved")
    .eq("id", reviewId)
    .maybeSingle();

  const { error } = await supabase.from("marketplace_vendor_reviews").delete().eq("id", reviewId);
  if (error) return { ok: false, error: error.message };

  if (review?.vendor_id && review.is_approved) {
    await refreshVendorReviewStats(supabase, review.vendor_id as string);
  }

  revalidateAdmin();
  return { ok: true };
}
