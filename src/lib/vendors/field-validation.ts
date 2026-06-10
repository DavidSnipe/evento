/** Inline field validation for vendor comparison tables. */

export function displayCellValue(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

/** Allow digits and a single decimal point (3500, 3500.50). */
export function sanitizePriceInput(raw: string): string {
  let out = "";
  let dotUsed = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if (ch === "." && !dotUsed) {
      out += ".";
      dotUsed = true;
    }
  }
  return out;
}

export function parsePriceValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function isValidPriceInput(raw: string): boolean {
  if (!raw.trim()) return true;
  return parsePriceValue(raw) !== null;
}

export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^\d+\s-]/g, "");
}

export function isValidPhoneInput(raw: string): boolean {
  if (!raw.trim()) return true;
  return /^[\d+\s-]+$/.test(raw.trim());
}

export function formatPriceForInput(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return "";
  return String(price);
}
