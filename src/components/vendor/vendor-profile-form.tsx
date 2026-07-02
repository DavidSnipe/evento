"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Clock } from "lucide-react";

import { updateVendorProfile } from "@/app/(vendor)/vendor/actions";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import { slugifyMarketplaceVendorName } from "@/lib/admin/slug";
import type { VendorPortalDetail } from "@/lib/vendor/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow } from "@/types/vendors";

type VendorProfileFormProps = {
  vendor: VendorPortalDetail;
  categories: VendorCategoryRow[];
};

export function VendorProfileForm({ vendor, categories }: VendorProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(true);

  const [name, setName] = useState(vendor.name);
  const [slug, setSlug] = useState(vendor.slug);
  const [tagline, setTagline] = useState(vendor.tagline ?? "");
  const [description, setDescription] = useState(vendor.description ?? "");
  const [website, setWebsite] = useState(vendor.website ?? "");
  const [email, setEmail] = useState(vendor.email ?? "");
  const [phone, setPhone] = useState(vendor.phone ?? "");
  const [locationCity, setLocationCity] = useState(vendor.location_city ?? "");
  const [locationCounty, setLocationCounty] = useState(vendor.location_county ?? "");
  const [logoUrl, setLogoUrl] = useState(vendor.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(vendor.cover_image_url ?? "");

  const initialCategorySet = useMemo(
    () => new Set(vendor.categories.map((c) => c.category_slug)),
    [vendor.categories]
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(initialCategorySet);
  const [primaryCategory, setPrimaryCategory] = useState(
    vendor.categories.find((c) => c.is_primary)?.category_slug ??
      vendor.categories[0]?.category_slug ??
      ""
  );

  const toggleCategory = (categorySlug: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categorySlug)) {
        next.delete(categorySlug);
        if (primaryCategory === categorySlug) setPrimaryCategory("");
      } else {
        next.add(categorySlug);
        if (!primaryCategory) setPrimaryCategory(categorySlug);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void updateVendorProfile({
        name,
        slug,
        tagline: tagline || null,
        description: description || null,
        website: website || null,
        email: email || null,
        phone: phone || null,
        location_city: locationCity || null,
        location_county: locationCounty || null,
        logo_url: logoUrl || null,
        cover_image_url: coverUrl || null,
        categories: Array.from(selectedCategories).map((category_slug) => ({
          category_slug,
          is_primary: category_slug === primaryCategory,
        })),
      }).then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Eroare la salvare.");
          return;
        }
        router.refresh();
      });
    });
  };

  return (
    <div className="space-y-6">
      {vendor.is_published ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">{ro.vendor.profile.published}</span>
          <Link
            href={`/marketplace/${vendor.slug}`}
            className="underline underline-offset-2"
          >
            {ro.vendor.profile.viewPublic}
          </Link>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{ro.vendor.profile.pendingApproval}</p>
            <p className="mt-0.5 text-amber-800/90">{ro.vendor.profile.pendingHint}</p>
          </div>
        </div>
      )}

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
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{ro.admin.vendors.form.phone}</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{ro.admin.vendors.form.city}</Label>
            <Input
              id="city"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="county">{ro.admin.vendors.form.county}</Label>
            <Input
              id="county"
              value={locationCounty}
              onChange={(e) => setLocationCounty(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">{ro.admin.vendors.form.logoUrl}</Label>
            <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover">{ro.admin.vendors.form.coverUrl}</Label>
            <Input id="cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
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
            {Array.from(selectedCategories).map((categorySlug) => (
              <option key={categorySlug} value={categorySlug}>
                {getMarketplaceCategoryLabel(categorySlug)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={pending} onClick={handleSubmit}>
        {pending ? ro.vendor.profile.saving : ro.vendor.profile.save}
      </Button>
    </div>
  );
}
