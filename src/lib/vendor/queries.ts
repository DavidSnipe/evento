import { createClient } from "@/lib/supabase/server";
import type {
  MarketplaceQuoteRequest,
  MarketplaceVendor,
  MarketplaceVendorAvailability,
  MarketplaceVendorPackage,
  MarketplaceVendorPortfolio,
} from "@/types/marketplace";

export type VendorPortalDetail = MarketplaceVendor & {
  categories: { category_slug: string; is_primary: boolean }[];
  packages: MarketplaceVendorPackage[];
  portfolio: MarketplaceVendorPortfolio[];
  availability: MarketplaceVendorAvailability[];
};

export type VendorQuoteRequestRow = MarketplaceQuoteRequest & {
  package_name: string | null;
};

export type VendorDashboardStats = {
  newRequests: number;
  totalRequests: number;
  reviewAvg: number | null;
  approvedReviewCount: number;
};

export type VendorEventPreview = {
  id: string;
  title: string;
  event_type: string;
  event_date: string | null;
};

export async function getMyVendorProfileByUserId(
  userId: string
): Promise<VendorPortalDetail | null> {
  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("marketplace_vendors")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getMyVendorProfileByUserId]", error.message);
    return null;
  }
  if (!vendor) return null;

  const vendorId = vendor.id as string;
  const [categoriesRes, packagesRes, portfolioRes, availabilityRes] = await Promise.all([
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
      .from("marketplace_vendor_availability")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("date", { ascending: true }),
  ]);

  return {
    ...(vendor as MarketplaceVendor),
    categories: (categoriesRes.data ?? []) as VendorPortalDetail["categories"],
    packages: (packagesRes.data ?? []) as MarketplaceVendorPackage[],
    portfolio: (portfolioRes.data ?? []) as MarketplaceVendorPortfolio[],
    availability: (availabilityRes.data ?? []) as MarketplaceVendorAvailability[],
  };
}

export async function getVendorDashboardStats(vendorId: string): Promise<VendorDashboardStats> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [vendorRes, totalRes, newRes, reviewsRes] = await Promise.all([
    supabase
      .from("marketplace_vendors")
      .select("review_avg, review_count")
      .eq("id", vendorId)
      .maybeSingle(),
    supabase
      .from("marketplace_quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId),
    supabase
      .from("marketplace_quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("status", "pending")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("marketplace_vendor_reviews")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("is_approved", true),
  ]);

  return {
    newRequests: newRes.count ?? 0,
    totalRequests: totalRes.count ?? 0,
    reviewAvg: vendorRes.data?.review_avg ?? null,
    approvedReviewCount: reviewsRes.count ?? 0,
  };
}

export async function getVendorRecentRequests(
  vendorId: string,
  limit = 5
): Promise<VendorQuoteRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_quote_requests")
    .select("*, marketplace_vendor_packages(name)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getVendorRecentRequests]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const { marketplace_vendor_packages, ...request } = row;
    const pkg = marketplace_vendor_packages as { name?: string } | null;
    return {
      ...(request as MarketplaceQuoteRequest),
      package_name: pkg?.name ?? null,
    };
  });
}

export async function getVendorQuoteRequests(vendorId: string): Promise<VendorQuoteRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_quote_requests")
    .select("*, marketplace_vendor_packages(name)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getVendorQuoteRequests]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const { marketplace_vendor_packages, ...request } = row;
    const pkg = marketplace_vendor_packages as { name?: string } | null;
    return {
      ...(request as MarketplaceQuoteRequest),
      package_name: pkg?.name ?? null,
    };
  });
}

export async function getVendorQuoteRequest(
  vendorId: string,
  requestId: string
): Promise<VendorQuoteRequestRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_quote_requests")
    .select("*, marketplace_vendor_packages(name)")
    .eq("vendor_id", vendorId)
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getVendorQuoteRequest]", error.message);
    return null;
  }

  const { marketplace_vendor_packages, ...request } = data;
  const pkg = marketplace_vendor_packages as { name?: string } | null;
  return {
    ...(request as MarketplaceQuoteRequest),
    package_name: pkg?.name ?? null,
  };
}

export async function getEventPreviewForVendor(
  eventId: string
): Promise<VendorEventPreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_type, event_date")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) return null;
  return data as VendorEventPreview;
}
