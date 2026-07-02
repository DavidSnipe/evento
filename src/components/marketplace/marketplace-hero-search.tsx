"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarketplaceCategoryOption } from "@/lib/marketplace/categories";
import { ro } from "@/lib/i18n/ro";

type MarketplaceHeroSearchProps = {
  categories: MarketplaceCategoryOption[];
  initialSearch?: string;
  initialCategory?: string;
  basePath?: string;
};

export function MarketplaceHeroSearch({
  categories,
  initialSearch = "",
  initialCategory = "",
  basePath = "/marketplace",
}: MarketplaceHeroSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (category) params.set("category", category);
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-[hsl(350,35%,96%)] via-background to-[hsl(30,45%,95%)] px-6 py-12 text-center md:px-10 md:py-16">
      <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-5xl">
        {ro.marketplace.hero.title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-lg">
        {ro.marketplace.hero.subtitle}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-8 flex max-w-3xl flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ro.marketplace.hero.searchPlaceholder}
            className="h-11 pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm sm:min-w-[180px]"
        >
          <option value="">{ro.marketplace.hero.categoryAll}</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.label}
            </option>
          ))}
        </select>
        <Button type="submit" className="h-11">
          {ro.marketplace.hero.searchButton}
        </Button>
      </form>
    </section>
  );
}
