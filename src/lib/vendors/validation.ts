import {
  VENDOR_PAYMENT_TYPES,
  VENDOR_STATUSES,
  type VendorInput,
  type VendorOfferInput,
  type VendorPaymentInput,
  type VendorPaymentType,
  type VendorStatus,
} from "@/types/vendors";

export type VendorActionResult = {
  success?: boolean;
  error?: string;
  id?: string;
};

export function parseVendorStatus(value: string): VendorStatus | null {
  return VENDOR_STATUSES.includes(value as VendorStatus) ? (value as VendorStatus) : null;
}

export function parseVendorPaymentType(value: string): VendorPaymentType | null {
  return VENDOR_PAYMENT_TYPES.includes(value as VendorPaymentType)
    ? (value as VendorPaymentType)
    : null;
}

export function requireVendorName(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCategorySlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(slug)) return null;
  return slug;
}

export function parseOptionalUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  try {
    const url = v.startsWith("http") ? v : `https://${v}`;
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

export function parseOptionalEmail(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

export function parseOptionalDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const d = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

export function parseOptionalMoney(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function parseRequiredMoney(
  value: string | number | null | undefined
): number | null {
  const n = parseOptionalMoney(value);
  if (n === null) return null;
  return n;
}

export function validateVendorInput(input: VendorInput): VendorActionResult | null {
  const name = requireVendorName(input.name);
  if (!name) return { error: "Numele furnizorului este obligatoriu." };

  const categoryId = parseCategorySlug(input.categoryId);
  if (!categoryId) return { error: "Categoria este invalidă." };

  if (input.status && !parseVendorStatus(input.status)) {
    return { error: "Status invalid." };
  }

  if (input.email && !parseOptionalEmail(input.email)) {
    return { error: "Email invalid." };
  }

  if (input.website && !parseOptionalUrl(input.website)) {
    return { error: "Website invalid." };
  }

  return null;
}

export function validateOfferInput(input: VendorOfferInput): VendorActionResult | null {
  const title = requireVendorName(input.title);
  if (!title) return { error: "Titlul ofertei este obligatoriu." };

  if (input.price != null && parseOptionalMoney(input.price) === null) {
    return { error: "Preț invalid." };
  }

  if (input.offerDate && !parseOptionalDate(input.offerDate)) {
    return { error: "Data ofertei este invalidă." };
  }

  if (input.expiryDate && !parseOptionalDate(input.expiryDate)) {
    return { error: "Data expirării este invalidă." };
  }

  return null;
}

export function validatePaymentInput(input: VendorPaymentInput): VendorActionResult | null {
  if (!parseVendorPaymentType(input.paymentType)) {
    return { error: "Tip de plată invalid." };
  }

  const planned = parseRequiredMoney(input.plannedAmount);
  if (planned === null) return { error: "Suma planificată este invalidă." };

  if (input.paidAmount != null && parseOptionalMoney(input.paidAmount) === null) {
    return { error: "Suma plătită este invalidă." };
  }

  if (input.dueDate && !parseOptionalDate(input.dueDate)) {
    return { error: "Data scadentă este invalidă." };
  }

  return null;
}
