"use client";

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
import type { MarketplaceSort } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";

type MarketplaceFiltersProps = {
  initialLocation: string;
  initialMinRating: number;
  initialSort: MarketplaceSort;
  basePath?: string;
};

function buildParams(
  base: URLSearchParams,
  updates: {
    location?: string;
    minRating?: number;
    sort?: MarketplaceSort;
  }
) {
  const params = new URLSearchParams(base.toString());
  params.delete("page");

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
  location,
  minRating,
  sort,
  onApply,
}: {
  location: string;
  minRating: number;
  sort: MarketplaceSort;
  onApply: (data: { location: string; minRating: number; sort: MarketplaceSort }) => void;
}) {
  const [loc, setLoc] = useState(location);
  const [rating, setRating] = useState(minRating);
  const [sortValue, setSortValue] = useState(sort);

  return (
    <div className="space-y-6">
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
          className="h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          className="h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          onClick={() => onApply({ location: loc, minRating: rating, sort: sortValue })}
        >
          {ro.marketplace.filters.apply}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLoc("");
            setRating(0);
            setSortValue("relevance");
            onApply({ location: "", minRating: 0, sort: "relevance" });
          }}
        >
          {ro.marketplace.filters.clear}
        </Button>
      </div>
    </div>
  );
}

export function MarketplaceFilters({
  initialLocation,
  initialMinRating,
  initialSort,
  basePath = "/marketplace",
}: MarketplaceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apply = (data: { location: string; minRating: number; sort: MarketplaceSort }) => {
    const params = buildParams(searchParams, {
      location: data.location,
      minRating: data.minRating,
      sort: data.sort,
    });
    router.push(`${basePath}?${params.toString()}`);
  };

  const formProps = {
    location: initialLocation,
    minRating: initialMinRating,
    sort: initialSort,
    onApply: apply,
  };

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-6 rounded-2xl border border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-5 shadow-[var(--dash-shadow-card)]">
          <h2 className="mb-4 font-semibold">{ro.marketplace.filters.title}</h2>
          <FilterForm {...formProps} />
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-11 gap-2">
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
