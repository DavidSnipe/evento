import { createClient } from "@/lib/supabase/server";
import type {
  MarketplaceVendor,
  MarketplaceVendorAvailability,
  MarketplaceVendorPackage,
  MarketplaceVendorPortfolio,
  MarketplaceVendorReview,
} from "@/types/marketplace";

export type MarketplaceVendorListItem = MarketplaceVendor & {
  categories: { category_slug: string; is_primary: boolean }[];
  primary_category_slug: string | null;
};

export type MarketplaceVendorDetail = MarketplaceVendor & {
  categories: { category_slug: string; is_primary: boolean }[];
  primary_category_slug: string | null;
  packages: MarketplaceVendorPackage[];
  portfolio: MarketplaceVendorPortfolio[];
  reviews: MarketplaceVendorReview[];
  availability: MarketplaceVendorAvailability[];
};

export type MarketplaceSort = "relevance" | "rating" | "newest";

export type MarketplaceVendorFilters = {
  search?: string;
  categorySlugs?: string[];
  location?: string;
  minRating?: number;
  sort?: MarketplaceSort;
  page?: number;
  pageSize?: number;
};

export type PaginatedVendorsResult = {
  vendors: MarketplaceVendorListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 12;

function mapVendorRow(
  row: Record<string, unknown>
): MarketplaceVendorListItem {
  const { marketplace_vendor_categories, ...vendor } = row;
  const categories = (marketplace_vendor_categories ?? []) as {
    category_slug: string;
    is_primary: boolean;
  }[];
  const primary = categories.find((c) => c.is_primary) ?? categories[0];
  return {
    ...(vendor as MarketplaceVendor),
    categories,
    primary_category_slug: primary?.category_slug ?? null,
  };
}

async function vendorIdsForCategories(categorySlugs: string[]): Promise<string[] | null> {
  if (categorySlugs.length === 0) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_vendor_categories")
    .select("vendor_id")
    .in("category_slug", categorySlugs);

  if (error) {
    console.error("[vendorIdsForCategories]", error.message);
    return [];
  }

  return [...new Set((data ?? []).map((r) => r.vendor_id as string))];
}

export async function getFeaturedVendors(limit = 12): Promise<MarketplaceVendorListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_vendors")
    .select("*, marketplace_vendor_categories(category_slug, is_primary)")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("review_avg", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[getFeaturedVendors]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapVendorRow(row as Record<string, unknown>));
}

export async function getPublishedVendors(
  filters: MarketplaceVendorFilters = {}
): Promise<PaginatedVendorsResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const sort = filters.sort ?? "relevance";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const categoryVendorIds = filters.categorySlugs?.length
    ? await vendorIdsForCategories(filters.categorySlugs)
    : null;

  if (categoryVendorIds && categoryVendorIds.length === 0) {
    return { vendors: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const supabase = await createClient();
  let query = supabase
    .from("marketplace_vendors")
    .select("*, marketplace_vendor_categories(category_slug, is_primary)", {
      count: "exact",
    })
    .eq("is_published", true);

  if (categoryVendorIds) {
    query = query.in("id", categoryVendorIds);
  }

  const search = filters.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      `name.ilike.${pattern},tagline.ilike.${pattern},location_city.ilike.${pattern},location_county.ilike.${pattern}`
    );
  }

  const location = filters.location?.trim();
  if (location) {
    const pattern = `%${location}%`;
    query = query.or(`location_city.ilike.${pattern},location_county.ilike.${pattern}`);
  }

  if (filters.minRating && filters.minRating > 0) {
    query = query.gte("review_avg", filters.minRating);
  }

  if (sort === "rating") {
    query = query
      .order("review_avg", { ascending: false, nullsFirst: false })
      .order("review_count", { ascending: false });
  } else if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query
      .order("is_featured", { ascending: false })
      .order("review_avg", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("[getPublishedVendors]", error.message);
    return { vendors: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;
  const vendors = (data ?? []).map((row) => mapVendorRow(row as Record<string, unknown>));

  return {
    vendors,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getVendorBySlug(slug: string): Promise<MarketplaceVendorDetail | null> {
  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("marketplace_vendors")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !vendor) {
    if (error) console.error("[getVendorBySlug]", error.message);
    return null;
  }

  const vendorId = vendor.id as string;
  const [categoriesRes, packagesRes, portfolioRes, reviewsRes, availabilityRes] =
    await Promise.all([
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
      supabase
        .from("marketplace_vendor_reviews")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("marketplace_vendor_availability")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("date", { ascending: true }),
    ]);

  const categories = (categoriesRes.data ?? []) as {
    category_slug: string;
    is_primary: boolean;
  }[];
  const primary = categories.find((c) => c.is_primary) ?? categories[0];

  return {
    ...(vendor as MarketplaceVendor),
    categories,
    primary_category_slug: primary?.category_slug ?? null,
    packages: (packagesRes.data ?? []) as MarketplaceVendorPackage[],
    portfolio: (portfolioRes.data ?? []) as MarketplaceVendorPortfolio[],
    reviews: (reviewsRes.data ?? []) as MarketplaceVendorReview[],
    availability: (availabilityRes.data ?? []) as MarketplaceVendorAvailability[],
  };
}
