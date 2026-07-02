export const EVENTO_MODE_STORAGE_KEY = "evento_mode";

export type AccountMode = "planner" | "vendor";

export function parseAccountMode(value: string | null | undefined): AccountMode | null {
  if (value === "planner" || value === "vendor") {
    return value;
  }
  return null;
}

export function accountModeFromPath(pathname: string): AccountMode {
  return pathname.startsWith("/vendor") ? "vendor" : "planner";
}

export function dashboardPathForMode(mode: AccountMode): string {
  return mode === "vendor" ? "/vendor/dashboard" : "/dashboard";
}
