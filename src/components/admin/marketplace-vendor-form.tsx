"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createMarketplaceVendor,
  updateMarketplaceVendor,
} from "@/app/(admin)/admin/vendors/actions";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import type { AdminVendorDetail } from "@/lib/admin/queries";
import type {
  MarketplaceVendorPackageInput,
  MarketplaceVendorPortfolioInput,
  MarketplaceVendorSaveInput,
} from "@/lib/admin/marketplace-vendor-input";
import { slugifyMarketplaceVendorName } from "@/lib/admin/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow } from "@/types/vendors";

type MarketplaceVendorFormProps = {
  categories: VendorCategoryRow[];
  vendor?: AdminVendorDetail;
};

function emptyPackage(index: number): MarketplaceVendorPackageInput {
  return {
    category_slug: null,
    name: "",
    description: null,
    price_from: null,
    price_to: null,
    price_currency: "RON",
    price_label: null,
    price_is_visible: true,
    sort_order: index,
  };
}

function emptyPortfolio(index: number): MarketplaceVendorPortfolioInput {
  return {
    url: "",
    thumbnail_url: null,
    caption: null,
    media_type: "image",
    sort_order: index,
  };
}

export function MarketplaceVendorForm({ categories, vendor }: MarketplaceVendorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!!vendor);

  const [name, setName] = useState(vendor?.name ?? "");
  const [slug, setSlug] = useState(vendor?.slug ?? "");
  const [tagline, setTagline] = useState(vendor?.tagline ?? "");
  const [description, setDescription] = useState(vendor?.description ?? "");
  const [website, setWebsite] = useState(vendor?.website ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [locationCity, setLocationCity] = useState(vendor?.location_city ?? "");
  const [locationCounty, setLocationCounty] = useState(vendor?.location_county ?? "");
  const [logoUrl, setLogoUrl] = useState(vendor?.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(vendor?.cover_image_url ?? "");
  const [isPublished, setIsPublished] = useState(vendor?.is_published ?? false);
  const [isFeatured, setIsFeatured] = useState(vendor?.is_featured ?? false);
  const [isClaimed, setIsClaimed] = useState(vendor?.is_claimed ?? false);
  const [ownerId, setOwnerId] = useState(vendor?.owner_id ?? "");

  const initialCategorySet = useMemo(
    () => new Set((vendor?.categories ?? []).map((c) => c.category_slug)),
    [vendor]
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(initialCategorySet);
  const [primaryCategory, setPrimaryCategory] = useState(
    vendor?.categories.find((c) => c.is_primary)?.category_slug ??
      vendor?.categories[0]?.category_slug ??
      ""
  );

  const [packages, setPackages] = useState<MarketplaceVendorPackageInput[]>(
    vendor?.packages.length
      ? vendor.packages.map((p) => ({
          id: p.id,
          category_slug: p.category_slug,
          name: p.name,
          description: p.description,
          price_from: p.price_from,
          price_to: p.price_to,
          price_currency: p.price_currency,
          price_label: p.price_label,
          price_is_visible: p.price_is_visible,
          sort_order: p.sort_order,
        }))
      : [emptyPackage(0)]
  );

  const [portfolio, setPortfolio] = useState<MarketplaceVendorPortfolioInput[]>(
    vendor?.portfolio.length
      ? vendor.portfolio.map((p) => ({
          id: p.id,
          url: p.url,
          thumbnail_url: p.thumbnail_url,
          caption: p.caption,
          media_type: p.media_type,
          sort_order: p.sort_order,
        }))
      : []
  );

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        if (primaryCategory === slug) setPrimaryCategory("");
      } else {
        next.add(slug);
        if (!primaryCategory) setPrimaryCategory(slug);
      }
      return next;
    });
  };

  const buildPayload = (): MarketplaceVendorSaveInput => ({
    name,
    slug,
    tagline: tagline || null,
    description: description || null,
    website: website || null,
    email: email || null,
    phone: phone || null,
    location_city: locationCity || null,
    location_county: locationCounty || null,
    location_country: "RO",
    is_published: isPublished,
    is_featured: isFeatured,
    is_claimed: isClaimed,
    owner_id: ownerId || null,
    logo_url: logoUrl || null,
    cover_image_url: coverUrl || null,
    categories: Array.from(selectedCategories).map((category_slug) => ({
      category_slug,
      is_primary: category_slug === primaryCategory,
    })),
    packages: packages
      .filter((p) => p.name.trim())
      .map((p, index) => ({ ...p, sort_order: index })),
    portfolio: portfolio
      .filter((p) => p.url.trim())
      .map((p, index) => ({ ...p, sort_order: index })),
  });

  const handleSubmit = () => {
    setError(null);
    const payload = buildPayload();
    startTransition(async () => {
      const result = vendor
        ? await updateMarketplaceVendor(vendor.id, payload)
        : await createMarketplaceVendor(payload);

      if (!result.ok) {
        setError(result.error ?? "Eroare la salvare.");
        return;
      }

      router.push(result.id ? `/admin/vendors/${result.id}` : "/admin/vendors");
      router.refresh();
    });
  };

  const movePortfolio = (index: number, direction: -1 | 1) => {
    setPortfolio((items) => {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return items;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--dash-text)]">
          {ro.admin.vendors.form.basic}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{ro.admin.vendors.form.name}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugifyMarketplaceVendorName(next));
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{ro.admin.vendors.form.slug}</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tagline">{ro.admin.vendors.form.tagline}</Label>
            <Input
              id="tagline"
              value={tagline}
              maxLength={100}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{ro.admin.vendors.form.description}</Label>
            <textarea
              id="description"
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">{ro.admin.vendors.form.website}</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{ro.admin.vendors.form.email}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{ro.admin.vendors.form.phone}</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{ro.admin.vendors.form.city}</Label>
            <Input id="city" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="county">{ro.admin.vendors.form.county}</Label>
            <Input
              id="county"
              value={locationCounty}
              onChange={(e) => setLocationCounty(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold">{ro.admin.vendors.form.categories}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((cat) => (
            <label key={cat.slug} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <input
                type="checkbox"
                checked={selectedCategories.has(cat.slug)}
                onChange={() => toggleCategory(cat.slug)}
              />
              <span className="text-sm">{getMarketplaceCategoryLabel(cat.slug)}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="primary">{ro.admin.vendors.form.primaryCategory}</Label>
          <select
            id="primary"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={primaryCategory}
            onChange={(e) => setPrimaryCategory(e.target.value)}
          >
            <option value="">—</option>
            {Array.from(selectedCategories).map((slug) => (
              <option key={slug} value={slug}>
                {getMarketplaceCategoryLabel(slug)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{ro.admin.vendors.form.packages}</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPackages((p) => [...p, emptyPackage(p.length)])}
          >
            <Plus className="mr-1 h-4 w-4" />
            {ro.admin.vendors.form.addPackage}
          </Button>
        </div>
        <div className="space-y-4">
          {packages.map((pkg, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setPackages((p) => p.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder={ro.admin.vendors.form.packageName}
                  value={pkg.name}
                  onChange={(e) =>
                    setPackages((p) =>
                      p.map((row, i) => (i === index ? { ...row, name: e.target.value } : row))
                    )
                  }
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={pkg.category_slug ?? ""}
                  onChange={(e) =>
                    setPackages((p) =>
                      p.map((row, i) =>
                        i === index ? { ...row, category_slug: e.target.value || null } : row
                      )
                    )
                  }
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {getMarketplaceCategoryLabel(c.slug)}
                    </option>
                  ))}
                </select>
                <textarea
                  className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
                  placeholder={ro.admin.vendors.form.packageDescription}
                  value={pkg.description ?? ""}
                  onChange={(e) =>
                    setPackages((p) =>
                      p.map((row, i) =>
                        i === index ? { ...row, description: e.target.value || null } : row
                      )
                    )
                  }
                />
                <Input
                  type="number"
                  placeholder={ro.admin.vendors.form.priceFrom}
                  value={pkg.price_from ?? ""}
                  onChange={(e) =>
                    setPackages((p) =>
                      p.map((row, i) =>
                        i === index
                          ? { ...row, price_from: e.target.value ? Number(e.target.value) : null }
                          : row
                      )
                    )
                  }
                />
                <Input
                  type="number"
                  placeholder={ro.admin.vendors.form.priceTo}
                  value={pkg.price_to ?? ""}
                  onChange={(e) =>
                    setPackages((p) =>
                      p.map((row, i) =>
                        i === index
                          ? { ...row, price_to: e.target.value ? Number(e.target.value) : null }
                          : row
                      )
                    )
                  }
                />
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={pkg.price_is_visible}
                    onChange={(e) =>
                      setPackages((p) =>
                        p.map((row, i) =>
                          i === index ? { ...row, price_is_visible: e.target.checked } : row
                        )
                      )
                    }
                  />
                  {ro.admin.vendors.form.showPrice}
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold">{ro.admin.vendors.form.media}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{ro.admin.vendors.form.logoUrl}</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{ro.admin.vendors.form.coverUrl}</Label>
            <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <Label>Portofoliu</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPortfolio((p) => [...p, emptyPortfolio(p.length)])}
            >
              <Plus className="mr-1 h-4 w-4" />
              {ro.admin.vendors.form.addPortfolio}
            </Button>
          </div>
          <div className="space-y-2">
            {portfolio.map((item, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Input
                  className="min-w-[240px] flex-1"
                  placeholder={ro.admin.vendors.form.portfolioUrl}
                  value={item.url}
                  onChange={(e) =>
                    setPortfolio((p) =>
                      p.map((row, i) => (i === index ? { ...row, url: e.target.value } : row))
                    )
                  }
                />
                <Button type="button" size="sm" variant="outline" onClick={() => movePortfolio(index, -1)}>
                  {ro.admin.vendors.form.moveUp}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => movePortfolio(index, 1)}>
                  {ro.admin.vendors.form.moveDown}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setPortfolio((p) => p.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold">{ro.admin.vendors.form.status}</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            {ro.admin.vendors.form.isPublished}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            {ro.admin.vendors.form.isFeatured}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isClaimed} onChange={(e) => setIsClaimed(e.target.checked)} />
            {ro.admin.vendors.form.isClaimed}
          </label>
          <div className="space-y-2 pt-2">
            <Label htmlFor="ownerId">{ro.admin.vendors.form.ownerId}</Label>
            <Input id="ownerId" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="button" disabled={pending} onClick={handleSubmit}>
          {pending ? ro.admin.vendors.form.saving : ro.admin.vendors.form.save}
        </Button>
      </div>
    </div>
  );
}
