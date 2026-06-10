/** Detect whether Phase 6.1 vendor foundation tables/columns exist. */
export function isVendorFoundationSchemaMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("vendor_categories") ||
    msg.includes("event_vendor_categories") ||
    msg.includes("event_vendor_services") ||
    msg.includes("service_id") ||
    msg.includes("category_id") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}
