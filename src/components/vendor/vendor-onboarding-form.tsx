"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createVendorProfile } from "@/app/(vendor)/vendor/actions";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import { slugifyMarketplaceVendorName } from "@/lib/admin/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow } from "@/types/vendors";

type VendorOnboardingFormProps = {
  categories: VendorCategoryRow[];
};

export function VendorOnboardingForm({ categories }: VendorOnboardingFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [primary, setPrimary] = useState("");

  const selectedList = useMemo(() => Array.from(selected), [selected]);

  const toggleCategory = (categorySlug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(categorySlug)) {
        next.delete(categorySlug);
        if (primary === categorySlug) setPrimary("");
      } else {
        next.add(categorySlug);
        if (!primary) setPrimary(categorySlug);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void createVendorProfile({
        name,
        slug: slug || slugifyMarketplaceVendorName(name),
        categories: selectedList.map((category_slug) => ({
          category_slug,
          is_primary: category_slug === primary,
        })),
      }).then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Eroare la creare.");
          return;
        }
        router.push("/vendor/profile");
        router.refresh();
      });
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-[18px] border border-[var(--dash-hairline)] bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">
          {ro.vendor.onboarding.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--dash-text-secondary)]">
          {ro.vendor.onboarding.description}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">{ro.vendor.onboarding.businessName}</Label>
          <Input
            id="business-name"
            value={name}
            required
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!slugTouched) setSlug(slugifyMarketplaceVendorName(next));
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">{ro.vendor.onboarding.slug}</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>{ro.vendor.onboarding.categories}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((cat) => (
              <label
                key={cat.slug}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(cat.slug)}
                  onChange={() => toggleCategory(cat.slug)}
                />
                {getMarketplaceCategoryLabel(cat.slug)}
              </label>
            ))}
          </div>
        </div>

        {selectedList.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="primary">{ro.vendor.onboarding.primaryCategory}</Label>
            <select
              id="primary"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
            >
              <option value="">—</option>
              {selectedList.map((categorySlug) => (
                <option key={categorySlug} value={categorySlug}>
                  {getMarketplaceCategoryLabel(categorySlug)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        disabled={pending || !name.trim() || selected.size === 0}
        onClick={handleSubmit}
      >
        {pending ? ro.vendor.onboarding.creating : ro.vendor.onboarding.create}
      </Button>
    </div>
  );
}
