import { DashboardPage } from "@/components/layout/animated-page";
import { MarketplaceListing } from "@/components/marketplace/marketplace-listing";
import { PageHeader } from "@/components/nuntiki/page-header";
import { reconcileActiveEventAccess } from "@/lib/events/active-event-access";
import { getEventById } from "@/lib/events/queries";
import { getMarketplaceCategoryOptions } from "@/lib/marketplace/categories";
import {
  getFeaturedVendors,
  getPublishedVendors,
  type MarketplaceSort,
} from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.marketplace.dashboard.title,
};

type DashboardMarketplacePageProps = {
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

export default async function DashboardMarketplacePage({
  searchParams,
}: DashboardMarketplacePageProps) {
  const params = await searchParams;
  const categories = getMarketplaceCategoryOptions();
  const categorySlugs = parseCategories(params.category);
  const location = params.location ?? "";
  const minRating = params.minRating ? Number(params.minRating) : 0;
  const sort = (params.sort as MarketplaceSort) || "relevance";
  const page = params.page ? Math.max(1, Number(params.page)) : 1;
  const search = params.q ?? "";

  const activeEventId = await reconcileActiveEventAccess();
  const activeEvent = activeEventId ? await getEventById(activeEventId) : null;

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

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.marketplace.dashboard.title}
          description={ro.marketplace.dashboard.description}
        />
      }
    >
      <MarketplaceListing
        basePath="/dashboard/marketplace"
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
        mode="dashboard"
        eventId={activeEventId}
        eventTitle={activeEvent?.title ?? null}
      />
    </DashboardPage>
  );
}
