import { createClient } from "@/lib/supabase/server";
import type {
  MarketplaceQuoteRequest,
  MarketplaceVendor,
  MarketplaceVendorPackage,
  MarketplaceVendorPortfolio,
  MarketplaceVendorReview,
} from "@/types/marketplace";
import type { VendorCategoryRow } from "@/types/vendors";

import { getMarketplaceCategoryLabel } from "./category-labels";

export type AdminOverviewStats = {
  totalVendors: number;
  pendingPublishVendors: number;
  pendingReviews: number;
  totalQuoteRequests: number;
  newQuoteRequests: number;
  totalUsers: number;
};

export type AdminVendorListRow = MarketplaceVendor & {
  category_slugs: string[];
};

export type AdminVendorDetail = MarketplaceVendor & {
  categories: { category_slug: string; is_primary: boolean }[];
  packages: MarketplaceVendorPackage[];
  portfolio: MarketplaceVendorPortfolio[];
};

export type AdminReviewRow = MarketplaceVendorReview & {
  vendor_name: string;
};

export type AdminQuoteRequestRow = MarketplaceQuoteRequest & {
  vendor_name: string;
};

function isMissingMarketplaceSchema(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("marketplace_") && msg.includes("does not exist");
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString();

  const [
    vendorsRes,
    pendingVendorsRes,
    pendingReviewsRes,
    quotesRes,
    newQuotesRes,
    profilesRes,
  ] = await Promise.all([
    supabase.from("marketplace_vendors").select("id", { count: "exact", head: true }),
    supabase
      .from("marketplace_vendors")
      .select("id", { count: "exact", head: true })
      .eq("is_published", false),
    supabase
      .from("marketplace_vendor_reviews")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false),
    supabase.from("marketplace_quote_requests").select("id", { count: "exact", head: true }),
    supabase
      .from("marketplace_quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", since),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalVendors: vendorsRes.count ?? 0,
    pendingPublishVendors: pendingVendorsRes.count ?? 0,
    pendingReviews: pendingReviewsRes.count ?? 0,
    totalQuoteRequests: quotesRes.count ?? 0,
    newQuoteRequests: newQuotesRes.count ?? 0,
    totalUsers: profilesRes.count ?? 0,
  };
}

export async function getAdminRecentUnpublishedVendors(limit = 5): Promise<MarketplaceVendor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_vendors")
    .select("*")
    .eq("is_published", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (!isMissingMarketplaceSchema(error)) console.error("[getAdminRecentUnpublishedVendors]", error);
    return [];
  }

  return (data ?? []) as MarketplaceVendor[];
}

export async function getAdminVendorCategories(): Promise<VendorCategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getAdminVendorCategories]", error);
    return [];
  }

  return (data ?? []) as VendorCategoryRow[];
}

export async function getAdminVendorsList(filters?: {
  q?: string;
  category?: string;
  city?: string;
  status?: "published" | "unpublished" | "featured";
}): Promise<AdminVendorListRow[]> {
  const supabase = await createClient();

  let query = supabase.from("marketplace_vendors").select("*").order("created_at", { ascending: false });

  if (filters?.q?.trim()) {
    query = query.ilike("name", `%${filters.q.trim()}%`);
  }
  if (filters?.city?.trim()) {
    query = query.ilike("location_city", `%${filters.city.trim()}%`);
  }
  if (filters?.status === "published") {
    query = query.eq("is_published", true);
  } else if (filters?.status === "unpublished") {
    query = query.eq("is_published", false);
  } else if (filters?.status === "featured") {
    query = query.eq("is_featured", true);
  }

  const { data: vendors, error } = await query;
  if (error) {
    if (!isMissingMarketplaceSchema(error)) console.error("[getAdminVendorsList]", error);
    return [];
  }

  const vendorRows = (vendors ?? []) as MarketplaceVendor[];
  if (vendorRows.length === 0) return [];

  const vendorIds = vendorRows.map((v) => v.id);
  const { data: categoryRows } = await supabase
    .from("marketplace_vendor_categories")
    .select("vendor_id, category_slug")
    .in("vendor_id", vendorIds);

  const categoriesByVendor = new Map<string, string[]>();
  for (const row of categoryRows ?? []) {
    const list = categoriesByVendor.get(row.vendor_id) ?? [];
    list.push(row.category_slug as string);
    categoriesByVendor.set(row.vendor_id, list);
  }

  let result = vendorRows.map((vendor) => ({
    ...vendor,
    category_slugs: categoriesByVendor.get(vendor.id) ?? [],
  }));

  if (filters?.category) {
    result = result.filter((v) => v.category_slugs.includes(filters.category!));
  }

  return result;
}

export async function getAdminVendorDetail(vendorId: string): Promise<AdminVendorDetail | null> {
  const supabase = await createClient();

  const { data: vendor, error } = await supabase
    .from("marketplace_vendors")
    .select("*")
    .eq("id", vendorId)
    .maybeSingle();

  if (error || !vendor) {
    if (error) console.error("[getAdminVendorDetail]", error);
    return null;
  }

  const [categoriesRes, packagesRes, portfolioRes] = await Promise.all([
    supabase
      .from("marketplace_vendor_categories")
      .select("category_slug, is_primary")
      .eq("vendor_id", vendorId),
    supabase
      .from("marketplace_vendor_packages")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("marketplace_vendor_portfolio")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    ...(vendor as MarketplaceVendor),
    categories: (categoriesRes.data ?? []) as AdminVendorDetail["categories"],
    packages: (packagesRes.data ?? []) as MarketplaceVendorPackage[],
    portfolio: (portfolioRes.data ?? []) as MarketplaceVendorPortfolio[],
  };
}

export async function getAdminReviews(tab: "pending" | "approved"): Promise<AdminReviewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_vendor_reviews")
    .select("*, marketplace_vendors(name)")
    .eq("is_approved", tab === "approved")
    .order("created_at", { ascending: false });

  if (error) {
    if (!isMissingMarketplaceSchema(error)) console.error("[getAdminReviews]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const { marketplace_vendors, ...review } = row;
    const vendorJoin = marketplace_vendors as { name?: string } | null;
    return {
      ...(review as MarketplaceVendorReview),
      vendor_name: vendorJoin?.name ?? getMarketplaceCategoryLabel("other"),
    };
  });
}

export async function getAdminQuoteRequests(statusFilter?: string): Promise<AdminQuoteRequestRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("marketplace_quote_requests")
    .select("*, marketplace_vendors(name)")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    if (!isMissingMarketplaceSchema(error)) console.error("[getAdminQuoteRequests]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const { marketplace_vendors, ...request } = row;
    const vendorJoin = marketplace_vendors as { name?: string } | null;
    return {
      ...(request as MarketplaceQuoteRequest),
      vendor_name: vendorJoin?.name ?? "—",
    };
  });
}

export async function getAdminVendorCityOptions(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_vendors")
    .select("location_city")
    .not("location_city", "is", null)
    .order("location_city");

  const cities = new Set<string>();
  for (const row of data ?? []) {
    if (row.location_city?.trim()) cities.add(row.location_city.trim());
  }
  return Array.from(cities);
}
