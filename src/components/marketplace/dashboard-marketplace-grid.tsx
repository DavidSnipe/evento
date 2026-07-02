"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addMarketplaceVendorToEvent } from "@/lib/marketplace/add-to-event";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { Button } from "@/components/ui/button";
import type { MarketplaceVendorListItem } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";

type DashboardMarketplaceGridProps = {
  vendors: MarketplaceVendorListItem[];
  eventId: string | null;
  eventTitle?: string | null;
};

export function DashboardMarketplaceGrid({
  vendors,
  eventId,
  eventTitle,
}: DashboardMarketplaceGridProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; href?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (marketplaceVendorId: string) => {
    if (!eventId) {
      setError(ro.marketplace.dashboard.noEvent);
      return;
    }

    setError(null);
    setPendingId(marketplaceVendorId);
    startTransition(() => {
      void addMarketplaceVendorToEvent(eventId, marketplaceVendorId).then((result) => {
        setPendingId(null);
        if (!result.ok) {
          setError(result.error ?? "Eroare la adăugare.");
          return;
        }
        setToast({
          message: ro.marketplace.dashboard.success,
          href: result.vendorsUrl,
        });
        router.refresh();
      });
    });
  };

  return (
    <div className="space-y-4">
      {eventId && eventTitle ? (
        <p className="text-sm text-muted-foreground">
          {ro.marketplace.dashboard.activeEvent.replace("{name}", eventTitle)}
        </p>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ro.marketplace.dashboard.noEvent}
        </p>
      )}

      {toast ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {toast.message}{" "}
          {toast.href ? (
            <Link href={toast.href} className="font-medium underline underline-offset-2">
              {ro.marketplace.dashboard.openVendors}
            </Link>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            footerAction={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full bg-[var(--dash-blush)]/40 text-[var(--dash-accent-text)] hover:bg-[var(--dash-blush)]/60"
                disabled={!eventId || pending}
                onClick={() => handleAdd(vendor.id)}
              >
                {pendingId === vendor.id
                  ? ro.marketplace.dashboard.adding
                  : ro.marketplace.dashboard.addToEvent}
              </Button>
            }
          />
        ))}
      </div>
    </div>
  );
}
