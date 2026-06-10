import type { EventVendorWithRelations } from "@/types/vendors";
import { parsePriceValue } from "@/lib/vendors/field-validation";

export type ServiceTableRow = {
  rowKey: string;
  vendorId: string;
  packageId: string;
  categorySlug: string;
  serviceId: string;
  vendorName: string;
  packageName: string;
  price: number | null;
  currency: string;
  phone: string;
  notes: string;
  isSelected: boolean;
  isMuted: boolean;
};

export type DraftServiceRow = {
  vendorName: string;
  packageName: string;
  price: string;
  phone: string;
  notes: string;
};

export const emptyDraftRow = (): DraftServiceRow => ({
  vendorName: "",
  packageName: "",
  price: "",
  phone: "",
  notes: "",
});

export function draftHasContent(draft: DraftServiceRow): boolean {
  return Boolean(
    draft.vendorName.trim() ||
      draft.packageName.trim() ||
      draft.price.trim() ||
      draft.phone.trim() ||
      draft.notes.trim()
  );
}

export function buildServiceTableRows(
  vendors: EventVendorWithRelations[],
  categorySlug: string,
  serviceId: string,
  selectedOfferId: string | null
): ServiceTableRow[] {
  const rows: ServiceTableRow[] = [];

  for (const vendor of vendors) {
    const phone = vendor.phone ?? "";
    const notes = vendor.notes ?? "";

    for (const pkg of vendor.offers) {
      const isSelected = Boolean(selectedOfferId && pkg.id === selectedOfferId);
      rows.push({
        rowKey: `${vendor.id}-${pkg.id}`,
        vendorId: vendor.id,
        packageId: pkg.id,
        categorySlug,
        serviceId,
        vendorName: vendor.name,
        packageName: pkg.title,
        price: pkg.price != null ? Number(pkg.price) : null,
        currency: pkg.currency,
        phone,
        notes,
        isSelected,
        isMuted: Boolean(selectedOfferId && !isSelected),
      });
    }
  }

  return rows.sort((a, b) => {
    const pa = a.price ?? Infinity;
    const pb = b.price ?? Infinity;
    return pa - pb;
  });
}

/** @deprecated Use parsePriceValue from field-validation */
export function parseInlinePrice(raw: string): number | null {
  return parsePriceValue(raw);
}
