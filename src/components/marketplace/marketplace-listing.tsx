import { Suspense } from "react";

import { DashboardMarketplaceGrid } from "@/components/marketplace/dashboard-marketplace-grid";
import { FeaturedVendorsRow } from "@/components/marketplace/featured-vendors-row";
import { MarketplaceCategoryPills } from "@/components/marketplace/marketplace-category-pills";
import { MarketplaceHeroSearch } from "@/components/marketplace/marketplace-hero-search";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { MarketplacePagination } from "@/components/marketplace/marketplace-pagination";
import { MarketplaceResultsToolbar } from "@/components/marketplace/marketplace-results-toolbar";
import { VendorCard } from "@/components/marketplace/vendor-card";
import type { MarketplaceCategoryOption } from "@/lib/marketplace/categories";
import { hasActiveMarketplaceFilters } from "@/lib/marketplace/search-params";
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
  const filtersActive = hasActiveMarketplaceFilters({
    search,
    categorySlugs,
    location,
    minRating,
  });
  const showFeatured =
    mode === "public" &&
    page === 1 &&
    !filtersActive &&
    featured.length > 0;

  return (
    <div className="space-y-8">
      <MarketplaceHeroSearch
        basePath={basePath}
        initialSearch={search}
        initialLocation={location}
        compact={mode === "dashboard"}
      />

      {showFeatured ? <FeaturedVendorsRow vendors={featured} /> : null}

      <MarketplaceCategoryPills
        basePath={basePath}
        categories={categories}
        categorySlugs={categorySlugs}
        searchParams={searchParams}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Suspense fallback={null}>
          <MarketplaceFilters
            basePath={basePath}
            initialLocation={location}
            initialMinRating={minRating}
            initialSort={sort}
          />
        </Suspense>

        <div className="min-w-0 flex-1 space-y-5">
          <MarketplaceResultsToolbar
            basePath={basePath}
            categories={categories}
            categorySlugs={categorySlugs}
            location={location}
            minRating={minRating}
            sort={sort}
            search={search}
            searchParams={searchParams}
            total={listing.total}
          />

          {listing.vendors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--dash-hairline)] py-16 text-center text-[var(--dash-text-muted)]">
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
