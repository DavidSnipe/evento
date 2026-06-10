import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow } from "@/types/vendors";

export function slugifyCategoryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return base || `category_${Date.now()}`;
}

export function resolveCategoryLabel(
  slug: string,
  categories: VendorCategoryRow[]
): string {
  const row = categories.find((c) => c.slug === slug);
  if (!row) {
    return ro.vendors.categories[slug as keyof typeof ro.vendors.categories] ?? slug;
  }
  if (!row.is_system) {
    if (row.label_key.startsWith("vendors.categories.")) {
      const key = row.label_key.replace("vendors.categories.", "");
      return ro.vendors.categories[key as keyof typeof ro.vendors.categories] ?? key;
    }
    return row.label_key;
  }
  const key = row.label_key.replace("vendors.categories.", "");
  return ro.vendors.categories[key as keyof typeof ro.vendors.categories] ?? key;
}
