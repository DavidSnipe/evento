"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { updateVendorPortfolio, type VendorPortfolioInput } from "@/app/(vendor)/vendor/actions";
import type { MarketplaceVendorPortfolio } from "@/types/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";

type VendorPortfolioEditorProps = {
  portfolio: MarketplaceVendorPortfolio[];
};

function toInput(item: MarketplaceVendorPortfolio, index: number): VendorPortfolioInput {
  return {
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    caption: item.caption,
    media_type: item.media_type,
    sort_order: index,
  };
}

export function VendorPortfolioEditor({ portfolio }: VendorPortfolioEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<VendorPortfolioInput[]>(
    portfolio.map((item, index) => toInput(item, index))
  );
  const [newUrl, setNewUrl] = useState("");

  const move = (index: number, direction: -1 | 1) => {
    setRows((items) => {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return items;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addUrl = () => {
    const url = newUrl.trim();
    if (!url) return;
    setRows((items) => [
      ...items,
      { url, thumbnail_url: null, caption: null, media_type: "image", sort_order: items.length },
    ]);
    setNewUrl("");
  };

  const handleSave = () => {
    setError(null);
    startTransition(() => {
      void updateVendorPortfolio(rows).then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Eroare la salvare.");
          return;
        }
        router.refresh();
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder={ro.vendor.portfolio.addUrl}
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addUrl}>
          <Plus className="mr-1 h-4 w-4" />
          {ro.vendor.portfolio.addUrl}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ro.vendor.portfolio.empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="overflow-hidden rounded-[14px] border border-[var(--dash-hairline)] bg-white"
            >
              <div className="relative aspect-[4/3] bg-[var(--dash-ivory)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.caption ?? ""}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-xs text-muted-foreground">{item.url}</span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setRows((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={pending} onClick={handleSave}>
        {pending ? ro.vendor.profile.saving : ro.vendor.portfolio.save}
      </Button>
    </div>
  );
}
