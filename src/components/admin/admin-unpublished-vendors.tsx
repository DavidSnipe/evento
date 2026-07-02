"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { publishVendor } from "@/app/(admin)/admin/vendors/actions";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import type { MarketplaceVendor } from "@/types/marketplace";

export function AdminUnpublishedVendorsList({ vendors }: { vendors: MarketplaceVendor[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (vendors.length === 0) {
    return (
      <p className="text-sm text-[var(--dash-text-secondary)]">{ro.admin.overview.noUnpublished}</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--dash-hairline)] rounded-[14px] border border-[var(--dash-hairline)] bg-white">
      {vendors.map((vendor) => (
        <li key={vendor.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link
              href={`/admin/vendors/${vendor.id}`}
              className="truncate font-medium text-[var(--dash-text)] hover:text-[var(--dash-accent-text)]"
            >
              {vendor.name}
            </Link>
            <p className="truncate text-xs text-[var(--dash-text-muted)]">
              {vendor.location_city ?? "—"} · {vendor.slug}
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void publishVendor(vendor.id).then(() => router.refresh());
              })
            }
          >
            {ro.admin.overview.publish}
          </Button>
        </li>
      ))}
    </ul>
  );
}
