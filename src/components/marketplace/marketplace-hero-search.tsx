"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";

type MarketplaceHeroSearchProps = {
  initialSearch?: string;
  initialLocation?: string;
  basePath?: string;
  compact?: boolean;
};

export function MarketplaceHeroSearch({
  initialSearch = "",
  initialLocation = "",
  basePath = "/marketplace",
  compact = false,
}: MarketplaceHeroSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [location, setLocation] = useState(initialLocation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (search.trim()) params.set("q", search.trim());
    else params.delete("q");

    if (location.trim()) params.set("location", location.trim());
    else params.delete("location");

    params.set("page", "1");
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  const form = (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? "flex flex-col gap-2 sm:flex-row"
          : "mx-auto mt-8 flex max-w-3xl flex-col gap-2 sm:flex-row"
      }
    >
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ro.marketplace.hero.searchPlaceholder}
          className="h-11 min-h-11 pl-9"
        />
      </div>
      <Input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder={ro.marketplace.filters.locationPlaceholder}
        className="h-11 min-h-11 sm:min-w-[180px]"
      />
      <Button type="submit" className="h-11 min-h-11 shrink-0">
        {ro.marketplace.hero.searchButton}
      </Button>
    </form>
  );

  if (compact) {
    return <section className="evento-card p-4 sm:p-5">{form}</section>;
  }

  return (
    <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-6 py-12 text-center shadow-[var(--dash-shadow-card)] md:px-10 md:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] md:text-5xl">
        {ro.marketplace.hero.title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-[var(--dash-text-secondary)] md:text-lg">
        {ro.marketplace.hero.subtitle}
      </p>
      {form}
    </section>
  );
}
