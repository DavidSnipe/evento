import type { VendorPortalDetail } from "./queries";

export type ProfileCompleteness = {
  percent: number;
  tips: string[];
  checks: {
    logo: boolean;
    description: boolean;
    packages: boolean;
    portfolio: boolean;
    availability: boolean;
  };
};

const TIP_KEYS = {
  logo: "logo",
  description: "description",
  packages: "packages",
  portfolio: "portfolio",
  availability: "availability",
} as const;

export function computeProfileCompleteness(vendor: VendorPortalDetail): ProfileCompleteness {
  const checks = {
    logo: Boolean(vendor.logo_url?.trim()),
    description: (vendor.description?.trim().length ?? 0) > 100,
    packages: vendor.packages.length >= 1,
    portfolio: vendor.portfolio.length >= 3,
    availability: vendor.availability.length >= 1,
  };

  const weights = [
    checks.logo,
    checks.description,
    checks.packages,
    checks.portfolio,
    checks.availability,
  ];
  const percent = Math.round((weights.filter(Boolean).length / weights.length) * 100);

  const tips: string[] = [];
  if (!checks.logo) tips.push(TIP_KEYS.logo);
  if (!checks.description) tips.push(TIP_KEYS.description);
  if (!checks.packages) tips.push(TIP_KEYS.packages);
  if (!checks.portfolio) tips.push(TIP_KEYS.portfolio);
  if (!checks.availability) tips.push(TIP_KEYS.availability);

  return { percent, tips, checks };
}

export function completenessTipLabel(
  tipKey: string,
  labels: Record<string, string>
): string {
  return labels[tipKey] ?? tipKey;
}
