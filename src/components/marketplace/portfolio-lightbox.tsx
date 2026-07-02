"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarketplaceVendorPortfolio } from "@/types/marketplace";

type PortfolioLightboxProps = {
  items: MarketplaceVendorPortfolio[];
  initialIndex: number | null;
  onClose: () => void;
};

export function PortfolioLightbox({ items, initialIndex, onClose }: PortfolioLightboxProps) {
  const [index, setIndex] = useState(initialIndex ?? 0);
  const open = initialIndex !== null;
  const item = items[index];

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl border-none bg-black/95 p-2 text-white sm:p-4">
        <DialogTitle className="sr-only">Portofoliu</DialogTitle>
        <div className="relative flex min-h-[50vh] items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.caption ?? ""}
            className="max-h-[75vh] w-full object-contain"
          />
        </div>
        {item.caption ? <p className="mt-2 text-center text-sm text-white/80">{item.caption}</p> : null}
        {items.length > 1 ? (
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="rounded bg-white/10 px-3 py-1 text-sm disabled:opacity-40"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              ‹
            </button>
            <span className="px-2 py-1 text-sm">
              {index + 1} / {items.length}
            </span>
            <button
              type="button"
              className="rounded bg-white/10 px-3 py-1 text-sm disabled:opacity-40"
              disabled={index === items.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              ›
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
