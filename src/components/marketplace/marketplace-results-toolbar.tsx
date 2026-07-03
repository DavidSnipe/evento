"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import type { MarketplaceCategoryOption } from "@/lib/marketplace/categories";
import type { MarketplaceSort } from "@/lib/marketplace/queries";
import {
  buildMarketplaceHref,
  hasActiveMarketplaceFilters,
  type MarketplaceSearchParams,
} from "@/lib/marketplace/search-params";
import { ro } from "@/lib/i18n/ro";

type MarketplaceResultsToolbarProps = {
  basePath: string;
  categories: MarketplaceCategoryOption[];
  categorySlugs: string[];
  location: string;
  minRating: number;
  sort: MarketplaceSort;
  search: string;
  searchParams: MarketplaceSearchParams;
  total: number;
};

function formatVendorCount(total: number) {
  return `${total} ${total === 1 ? "furnizor" : "furnizori"}`;
}

export function MarketplaceResultsToolbar({
  basePath,
  categories,
  categorySlugs,
  location,
  minRating,
  sort,
  search,
  searchParams,
  total,
}: MarketplaceResultsToolbarProps) {
  const router = useRouter();
  const hasFilters = hasActiveMarketplaceFilters({
    search,
    categorySlugs,
    location,
    minRating,
  });

  const chips: { key: string; label: string; href: string }[] = [];

  if (search.trim()) {
    chips.push({
      key: "q",
      label: `„${search.trim()}”`,
      href: buildMarketplaceHref(basePath, searchParams, { q: null, page: 1 }),
    });
  }

  categorySlugs.forEach((slug) => {
    const category = categories.find((cat) => cat.slug === slug);
    if (!category) return;
    chips.push({
      key: `category-${slug}`,
      label: category.label,
      href: buildMarketplaceHref(basePath, searchParams, {
        category: categorySlugs.filter((value) => value !== slug),
        page: 1,
      }),
    });
  });

  if (location.trim()) {
    chips.push({
      key: "location",
      label: location.trim(),
      href: buildMarketplaceHref(basePath, searchParams, { location: null, page: 1 }),
    });
  }

  if (minRating > 0) {
    chips.push({
      key: "minRating",
      label: `${minRating}+`,
      href: buildMarketplaceHref(basePath, searchParams, { minRating: 0, page: 1 }),
    });
  }

  return (
    <div className="motion-filter-toolbar space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[var(--dash-text)]">{formatVendorCount(total)}</p>

        <div className="flex items-center gap-2">
          <label htmlFor="marketplace-sort-mobile" className="sr-only">
            {ro.marketplace.sort.label}
          </label>
          <select
            id="marketplace-sort-mobile"
            value={sort}
            onChange={(e) => {
              router.push(
                buildMarketplaceHref(basePath, searchParams, {
                  sort: e.target.value as MarketplaceSort,
                  page: 1,
                })
              );
            }}
            className="h-11 min-h-11 rounded-md border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-3 text-sm lg:hidden"
          >
            <option value="relevance">{ro.marketplace.sort.relevance}</option>
            <option value="rating">{ro.marketplace.sort.rating}</option>
            <option value="newest">{ro.marketplace.sort.newest}</option>
          </select>

          {hasFilters ? (
            <Link
              href={buildMarketplaceHref(basePath, searchParams, {
                q: null,
                category: [],
                location: null,
                minRating: 0,
                page: 1,
              })}
              className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
            >
              {ro.marketplace.filters.clear}
            </Link>
          ) : null}
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="-mx-1 flex flex-wrap gap-2 px-1">
          {chips.map((chip, index) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="motion-filter-chip inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--dash-hairline)] bg-[var(--dash-ivory)] px-3 text-xs font-medium text-[var(--dash-text-secondary)] transition hover:border-[var(--dash-accent-text)]/30 hover:text-[var(--dash-accent-text)]"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              {chip.label}
              <X className="h-3 w-3 opacity-60" aria-hidden />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
