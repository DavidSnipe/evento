import { ro } from "@/lib/i18n/ro";

export function getMarketplaceCategoryLabel(slug: string): string {
  const labels = ro.vendors.categories as Record<string, string>;
  return labels[slug] ?? slug;
}
