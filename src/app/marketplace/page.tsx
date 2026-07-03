import type { Metadata } from "next";

import { MarketplaceListing } from "@/components/marketplace/marketplace-listing";
import { MarketplaceMotionShell } from "@/components/motion/marketplace-motion-shell";
import { getMarketplaceCategoryOptions } from "@/lib/marketplace/categories";
import {
  getFeaturedVendors,
  getPublishedVendors,
  type MarketplaceSort,
} from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: ro.marketplace.seo.homeTitle,
  description: ro.marketplace.seo.homeDescription,
  openGraph: {
    title: ro.marketplace.seo.homeTitle,
    description: ro.marketplace.seo.homeDescription,
  },
};

type MarketplacePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string | string[];
    location?: string;
    minRating?: string;
    sort?: string;
    page?: string;
  }>;
};

function parseCategories(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const categories = getMarketplaceCategoryOptions();
  const categorySlugs = parseCategories(params.category);
  const location = params.location ?? "";
  const minRating = params.minRating ? Number(params.minRating) : 0;
  const sort = (params.sort as MarketplaceSort) || "relevance";
  const page = params.page ? Math.max(1, Number(params.page)) : 1;
  const search = params.q ?? "";

  const [featured, listing] = await Promise.all([
    getFeaturedVendors(),
    getPublishedVendors({
      search,
      categorySlugs,
      location,
      minRating,
      sort,
      page,
    }),
  ]);

  const filterKey = [search, categorySlugs.join(","), location, minRating, sort, page].join("|");

  return (
    <MarketplaceMotionShell filterKey={filterKey}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <MarketplaceListing
          basePath="/marketplace"
          categories={categories}
          categorySlugs={categorySlugs}
          location={location}
          minRating={minRating}
          sort={sort}
          page={page}
          search={search}
          searchParams={params}
          featured={featured}
          listing={listing}
          mode="public"
        />
      </div>
    </MarketplaceMotionShell>
  );
}
