import type { MarketplaceSort } from "@/lib/marketplace/queries";

export type MarketplaceSearchParams = Record<string, string | string[] | undefined>;

type MarketplaceHrefUpdates = {
  q?: string | null;
  category?: string[] | null;
  location?: string | null;
  minRating?: number | null;
  sort?: MarketplaceSort | null;
  page?: number | null;
};

function parseCategories(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function getCategorySlugs(searchParams: MarketplaceSearchParams): string[] {
  return parseCategories(searchParams.category);
}

export function hasActiveMarketplaceFilters(input: {
  search: string;
  categorySlugs: string[];
  location: string;
  minRating: number;
}): boolean {
  return (
    Boolean(input.search.trim()) ||
    input.categorySlugs.length > 0 ||
    Boolean(input.location.trim()) ||
    input.minRating > 0
  );
}

export function buildMarketplaceHref(
  basePath: string,
  searchParams: MarketplaceSearchParams,
  updates: MarketplaceHrefUpdates = {}
): string {
  const params = new URLSearchParams();

  const q = updates.q !== undefined ? updates.q : (searchParams.q as string | undefined) ?? "";
  const categories =
    updates.category !== undefined
      ? updates.category
      : getCategorySlugs(searchParams);
  const location =
    updates.location !== undefined
      ? updates.location
      : (searchParams.location as string | undefined) ?? "";
  const minRating =
    updates.minRating !== undefined
      ? updates.minRating
      : searchParams.minRating
        ? Number(searchParams.minRating)
        : 0;
  const sort =
    updates.sort !== undefined
      ? updates.sort
      : ((searchParams.sort as MarketplaceSort | undefined) ?? "relevance");
  const page = updates.page !== undefined ? updates.page : Number(searchParams.page ?? 1);

  if (q?.trim()) params.set("q", q.trim());
  categories?.forEach((slug) => params.append("category", slug));
  if (location?.trim()) params.set("location", location.trim());
  if (minRating != null && minRating > 0) params.set("minRating", String(minRating));
  if (sort && sort !== "relevance") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
