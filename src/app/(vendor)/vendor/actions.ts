"use server";

import { revalidatePath } from "next/cache";

import { isValidMarketplaceSlug, slugifyMarketplaceVendorName } from "@/lib/admin/slug";
import type { MarketplaceVendorPackageInput } from "@/lib/admin/marketplace-vendor-input";
import type { MarketplacePortfolioMediaType } from "@/types/marketplace";
import { createClient } from "@/lib/supabase/server";
import { getMyVendorProfileByUserId } from "@/lib/vendor/queries";
import { requireVendorUser } from "@/lib/vendor/require-vendor";

export type VendorActionResult = { ok: boolean; error?: string; id?: string };

const VENDOR_PATHS = [
  "/vendor/dashboard",
  "/vendor/profile",
  "/vendor/packages",
  "/vendor/portfolio",
  "/vendor/availability",
  "/vendor/requests",
];

function revalidateVendor() {
  for (const path of VENDOR_PATHS) revalidatePath(path);
}

async function getOwnedVendorId(userId: string): Promise<string | null> {
  const vendor = await getMyVendorProfileByUserId(userId);
  return vendor?.id ?? null;
}

export async function getMyVendorProfile() {
  const { userId } = await requireVendorUser();
  return getMyVendorProfileByUserId(userId);
}

export type CreateVendorProfileInput = {
  name: string;
  slug: string;
  categories: { category_slug: string; is_primary: boolean }[];
};

export async function createVendorProfile(
  input: CreateVendorProfileInput
): Promise<VendorActionResult> {
  const { userId } = await requireVendorUser();

  const existing = await getMyVendorProfileByUserId(userId);
  if (existing) return { ok: false, error: "Profilul de furnizor există deja." };

  const name = input.name.trim();
  const slug = input.slug.trim() || slugifyMarketplaceVendorName(name);

  if (!name) return { ok: false, error: "Numele business-ului este obligatoriu." };
  if (!isValidMarketplaceSlug(slug)) {
    return { ok: false, error: "Slug invalid." };
  }
  if (input.categories.length === 0) {
    return { ok: false, error: "Selectează cel puțin o categorie." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_vendors")
    .insert({
      owner_id: userId,
      name,
      slug,
      is_claimed: true,
      is_published: false,
      is_featured: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createVendorProfile]", error);
    return { ok: false, error: error?.message ?? "Nu am putut crea profilul." };
  }

  await supabase.from("marketplace_vendor_categories").insert(
    input.categories.map((c) => ({
      vendor_id: data.id,
      category_slug: c.category_slug,
      is_primary: c.is_primary,
    }))
  );

  revalidateVendor();
  return { ok: true, id: data.id };
}

export type UpdateVendorProfileInput = {
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  location_city: string | null;
  location_county: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  categories: { category_slug: string; is_primary: boolean }[];
};

export async function updateVendorProfile(
  input: UpdateVendorProfileInput
): Promise<VendorActionResult> {
  const { userId } = await requireVendorUser();
  const vendorId = await getOwnedVendorId(userId);
  if (!vendorId) return { ok: false, error: "Profilul nu există." };

  if (!input.name.trim()) return { ok: false, error: "Numele este obligatoriu." };
  if (!isValidMarketplaceSlug(input.slug)) return { ok: false, error: "Slug invalid." };
  if (input.categories.length === 0) {
    return { ok: false, error: "Selectează cel puțin o categorie." };
  }

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
      logo_url: input.logo_url?.trim() || null,
      cover_image_url: input.cover_image_url?.trim() || null,
    })
    .eq("id", vendorId)
    .eq("owner_id", userId);

  if (error) return { ok: false, error: error.message };

  await supabase.from("marketplace_vendor_categories").delete().eq("vendor_id", vendorId);
  await supabase.from("marketplace_vendor_categories").insert(
    input.categories.map((c) => ({
      vendor_id: vendorId,
      category_slug: c.category_slug,
      is_primary: c.is_primary,
    }))
  );

  revalidateVendor();
  return { ok: true, id: vendorId };
}

export async function updateVendorPackages(
  packages: MarketplaceVendorPackageInput[]
): Promise<VendorActionResult> {
  const { userId } = await requireVendorUser();
  const vendorId = await getOwnedVendorId(userId);
  if (!vendorId) return { ok: false, error: "Profilul nu există." };

  const supabase = await createClient();
  await supabase.from("marketplace_vendor_packages").delete().eq("vendor_id", vendorId);

  const rows = packages
    .filter((p) => p.name.trim())
    .map((p, index) => ({
      vendor_id: vendorId,
      category_slug: p.category_slug,
      name: p.name.trim(),
      description: p.description?.trim() || null,
      price_from: p.price_from,
      price_to: p.price_to,
      price_currency: p.price_currency || "RON",
      price_label: p.price_label?.trim() || null,
      price_is_visible: p.price_is_visible,
      sort_order: index,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("marketplace_vendor_packages").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  revalidateVendor();
  return { ok: true };
}

export type VendorPortfolioInput = {
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  media_type: MarketplacePortfolioMediaType;
  sort_order: number;
};

export async function updateVendorPortfolio(
  portfolio: VendorPortfolioInput[]
): Promise<VendorActionResult> {
  const { userId } = await requireVendorUser();
  const vendorId = await getOwnedVendorId(userId);
  if (!vendorId) return { ok: false, error: "Profilul nu există." };

  const supabase = await createClient();
  await supabase.from("marketplace_vendor_portfolio").delete().eq("vendor_id", vendorId);

  const rows = portfolio
    .filter((p) => p.url.trim())
    .map((p, index) => ({
      vendor_id: vendorId,
      url: p.url.trim(),
      thumbnail_url: p.thumbnail_url?.trim() || null,
      caption: p.caption?.trim() || null,
      media_type: p.media_type,
      sort_order: index,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("marketplace_vendor_portfolio").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  revalidateVendor();
  return { ok: true };
}

export type VendorAvailabilityInput = {
  date: string;
  status: "available" | "unavailable" | "tentative";
  note?: string | null;
};

export async function updateAvailability(
  dates: VendorAvailabilityInput[]
): Promise<VendorActionResult> {
  const { userId } = await requireVendorUser();
  const vendorId = await getOwnedVendorId(userId);
  if (!vendorId) return { ok: false, error: "Profilul nu există." };

  const today = new Date().toISOString().slice(0, 10);
  const futureDates = dates.filter((d) => d.date >= today);

  const supabase = await createClient();
  await supabase.from("marketplace_vendor_availability").delete().eq("vendor_id", vendorId);

  if (futureDates.length > 0) {
    const { error } = await supabase.from("marketplace_vendor_availability").insert(
      futureDates.map((d) => ({
        vendor_id: vendorId,
        date: d.date,
        status: d.status,
        note: d.note?.trim() || null,
      }))
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidateVendor();
  return { ok: true };
}

export async function markQuoteRequestViewed(requestId: string): Promise<void> {
  const { userId } = await requireVendorUser();
  const vendorId = await getOwnedVendorId(userId);
  if (!vendorId) return;

  const supabase = await createClient();
  await supabase
    .from("marketplace_quote_requests")
    .update({ status: "viewed" })
    .eq("id", requestId)
    .eq("vendor_id", vendorId)
    .eq("status", "pending");
}

export async function respondToRequest(
  requestId: string,
  response: string,
  status: "responded" | "accepted" | "declined"
): Promise<VendorActionResult> {
  const { userId } = await requireVendorUser();
  const vendorId = await getOwnedVendorId(userId);
  if (!vendorId) return { ok: false, error: "Profilul nu există." };

  if (!response.trim()) return { ok: false, error: "Răspunsul este obligatoriu." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_quote_requests")
    .update({
      vendor_response: response.trim(),
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("vendor_id", vendorId);

  if (error) return { ok: false, error: error.message };

  revalidateVendor();
  revalidatePath(`/vendor/requests/${requestId}`);
  return { ok: true };
}
