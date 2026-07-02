"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MarketplaceCategoryOption } from "@/lib/marketplace/categories";
import type { MarketplaceSort } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";

type MarketplaceFiltersProps = {
  categories: MarketplaceCategoryOption[];
  initialCategorySlugs: string[];
  initialLocation: string;
  initialMinRating: number;
  initialSort: MarketplaceSort;
  basePath?: string;
};

function buildParams(
  base: URLSearchParams,
  updates: {
    categories?: string[];
    location?: string;
    minRating?: number;
    sort?: MarketplaceSort;
  }
) {
  const params = new URLSearchParams(base.toString());
  params.delete("page");

  if (updates.categories !== undefined) {
    params.delete("category");
    updates.categories.forEach((c) => params.append("category", c));
  }
  if (updates.location !== undefined) {
    if (updates.location.trim()) params.set("location", updates.location.trim());
    else params.delete("location");
  }
  if (updates.minRating !== undefined) {
    if (updates.minRating > 0) params.set("minRating", String(updates.minRating));
    else params.delete("minRating");
  }
  if (updates.sort !== undefined) {
    if (updates.sort !== "relevance") params.set("sort", updates.sort);
    else params.delete("sort");
  }

  params.set("page", "1");
  return params;
}

function FilterForm({
  categories,
  selectedCategories,
  location,
  minRating,
  sort,
  onApply,
}: {
  categories: MarketplaceCategoryOption[];
  selectedCategories: string[];
  location: string;
  minRating: number;
  sort: MarketplaceSort;
  onApply: (data: {
    categories: string[];
    location: string;
    minRating: number;
    sort: MarketplaceSort;
  }) => void;
}) {
  const [cats, setCats] = useState<string[]>(selectedCategories);
  const [loc, setLoc] = useState(location);
  const [rating, setRating] = useState(minRating);
  const [sortValue, setSortValue] = useState(sort);

  const toggleCategory = (slug: string) => {
    setCats((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{ro.marketplace.filters.category}</Label>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat.slug} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cats.includes(cat.slug)}
                onChange={() => toggleCategory(cat.slug)}
              />
              {cat.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-filter">{ro.marketplace.filters.location}</Label>
        <Input
          id="location-filter"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder={ro.marketplace.filters.locationPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating-filter">{ro.marketplace.filters.minRating}</Label>
        <select
          id="rating-filter"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          <option value={0}>{ro.marketplace.filters.anyRating}</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sort-filter">{ro.marketplace.sort.label}</Label>
        <select
          id="sort-filter"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={sortValue}
          onChange={(e) => setSortValue(e.target.value as MarketplaceSort)}
        >
          <option value="relevance">{ro.marketplace.sort.relevance}</option>
          <option value="rating">{ro.marketplace.sort.rating}</option>
          <option value="newest">{ro.marketplace.sort.newest}</option>
        </select>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1"
          onClick={() => onApply({ categories: cats, location: loc, minRating: rating, sort: sortValue })}
        >
          {ro.marketplace.filters.apply}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCats([]);
            setLoc("");
            setRating(0);
            setSortValue("relevance");
            onApply({ categories: [], location: "", minRating: 0, sort: "relevance" });
          }}
        >
          {ro.marketplace.filters.clear}
        </Button>
      </div>
    </div>
  );
}

export function MarketplaceFilters({
  categories,
  initialCategorySlugs,
  initialLocation,
  initialMinRating,
  initialSort,
  basePath = "/marketplace",
}: MarketplaceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apply = (data: {
    categories: string[];
    location: string;
    minRating: number;
    sort: MarketplaceSort;
  }) => {
    const params = buildParams(searchParams, {
      categories: data.categories,
      location: data.location,
      minRating: data.minRating,
      sort: data.sort,
    });
    router.push(`${basePath}?${params.toString()}`);
  };

  const formProps = {
    categories,
    selectedCategories: initialCategorySlugs,
    location: initialLocation,
    minRating: initialMinRating,
    sort: initialSort,
    onApply: apply,
  };

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-6 rounded-2xl border border-border/70 bg-white p-5">
          <h2 className="mb-4 font-semibold">{ro.marketplace.filters.title}</h2>
          <FilterForm {...formProps} />
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {ro.marketplace.filters.open}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{ro.marketplace.filters.title}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterForm {...formProps} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function MarketplaceCategoryNav({
  categories,
  basePath = "/marketplace",
}: {
  categories: MarketplaceCategoryOption[];
  basePath?: string;
}) {
  return (
    <section id="categorii" className="scroll-mt-24">
      <h2 className="mb-4 font-serif text-xl font-semibold">{ro.marketplace.nav.categories}</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`${basePath}?category=${cat.slug}&page=1`}
            className="rounded-full border border-border bg-white px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
