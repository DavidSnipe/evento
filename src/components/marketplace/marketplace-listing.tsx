import { Suspense } from "react";

import { DashboardMarketplaceGrid } from "@/components/marketplace/dashboard-marketplace-grid";
import { FeaturedVendorsRow } from "@/components/marketplace/featured-vendors-row";
import { MarketplaceHeroSearch } from "@/components/marketplace/marketplace-hero-search";
import {
  MarketplaceCategoryNav,
  MarketplaceFilters,
} from "@/components/marketplace/marketplace-filters";
import { MarketplacePagination } from "@/components/marketplace/marketplace-pagination";
import { VendorCard } from "@/components/marketplace/vendor-card";
import type { MarketplaceCategoryOption } from "@/lib/marketplace/categories";
import type {
  MarketplaceSort,
  MarketplaceVendorListItem,
  PaginatedVendorsResult,
} from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";

type MarketplaceListingProps = {
  basePath: string;
  categories: MarketplaceCategoryOption[];
  categorySlugs: string[];
  location: string;
  minRating: number;
  sort: MarketplaceSort;
  page: number;
  search: string;
  searchParams: Record<string, string | string[] | undefined>;
  featured: MarketplaceVendorListItem[];
  listing: PaginatedVendorsResult;
  mode?: "public" | "dashboard";
  eventId?: string | null;
  eventTitle?: string | null;
};

export function MarketplaceListing({
  basePath,
  categories,
  categorySlugs,
  location,
  minRating,
  sort,
  page,
  search,
  searchParams,
  featured,
  listing,
  mode = "public",
  eventId = null,
  eventTitle = null,
}: MarketplaceListingProps) {
  const showFeatured =
    page === 1 && !search && categorySlugs.length === 0 && !location && !minRating;

  return (
    <div className="space-y-10">
      <MarketplaceHeroSearch
        basePath={basePath}
        categories={categories}
        initialSearch={search}
        initialCategory={categorySlugs[0] ?? ""}
      />

      {showFeatured ? <FeaturedVendorsRow vendors={featured} /> : null}

      <MarketplaceCategoryNav categories={categories} basePath={basePath} />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Suspense fallback={null}>
          <MarketplaceFilters
            basePath={basePath}
            categories={categories}
            initialCategorySlugs={categorySlugs}
            initialLocation={location}
            initialMinRating={minRating}
            initialSort={sort}
          />
        </Suspense>

        <div className="min-w-0 flex-1 space-y-6">
          {listing.vendors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
              {ro.marketplace.empty}
            </div>
          ) : mode === "dashboard" ? (
            <DashboardMarketplaceGrid
              vendors={listing.vendors}
              eventId={eventId}
              eventTitle={eventTitle}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {listing.vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}

          <MarketplacePagination
            basePath={basePath}
            page={listing.page}
            totalPages={listing.totalPages}
            searchParams={searchParams}
          />
        </div>
      </div>
    </div>
  );
}
