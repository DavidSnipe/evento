import Link from "next/link";

import { buildMarketplaceHref } from "@/lib/marketplace/search-params";
import type { MarketplaceCategoryOption } from "@/lib/marketplace/categories";
import type { MarketplaceSearchParams } from "@/lib/marketplace/search-params";
import { ro } from "@/lib/i18n/ro";

type MarketplaceCategoryPillsProps = {
  basePath: string;
  categories: MarketplaceCategoryOption[];
  categorySlugs: string[];
  searchParams: MarketplaceSearchParams;
};

function pillClass(active: boolean) {
  return active
    ? "border-[var(--dash-accent-text)] bg-[var(--dash-accent-text)]/10 text-[var(--dash-accent-text)]"
    : "border-[var(--dash-hairline)] bg-[var(--dash-surface)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-accent-text)]/30 hover:text-[var(--dash-accent-text)]";
}

export function MarketplaceCategoryPills({
  basePath,
  categories,
  categorySlugs,
  searchParams,
}: MarketplaceCategoryPillsProps) {
  const activeSlug = categorySlugs[0] ?? null;

  return (
    <section id="categorii" className="scroll-mt-24">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        <Link
          href={buildMarketplaceHref(basePath, searchParams, { category: [], page: 1 })}
          className={`motion-filter-pill inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${pillClass(!activeSlug)}`}
        >
          {ro.marketplace.hero.categoryAll}
        </Link>
        {categories.map((cat) => {
          const isActive = activeSlug === cat.slug;
          const href = buildMarketplaceHref(basePath, searchParams, {
            category: isActive ? [] : [cat.slug],
            page: 1,
          });

          return (
            <Link
              key={cat.slug}
              href={href}
              className={`motion-filter-pill inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${pillClass(isActive)}`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
