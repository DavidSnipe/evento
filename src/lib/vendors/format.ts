export function formatVendorPrice(
  price: number | null | undefined,
  currency = "RON"
): string {
  if (price == null || !Number.isFinite(Number(price))) return "—";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price));
}

export function formatVendorDate(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}
