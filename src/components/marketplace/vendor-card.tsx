import Link from "next/link";

import { VendorStars } from "@/components/marketplace/vendor-stars";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { Button } from "@/components/ui/button";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import { getIconForVendorCategory } from "@/lib/icons/registry";
import { formatLocation } from "@/lib/marketplace/format";
import type { MarketplaceVendorListItem } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type VendorCardProps = {
  vendor: MarketplaceVendorListItem;
  className?: string;
  featured?: boolean;
  profileHref?: string;
  footerAction?: React.ReactNode;
};

export function VendorCard({
  vendor,
  className,
  featured,
  profileHref,
  footerAction,
}: VendorCardProps) {
  const href = profileHref ?? `/marketplace/${vendor.slug}`;
  const categorySlug = vendor.primary_category_slug ?? "other";
  const location = formatLocation(vendor.location_city, vendor.location_county);
  const reviewLabel = ro.marketplace.reviewsCount.replace(
    "{count}",
    String(vendor.review_count)
  );

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm transition hover:shadow-md",
        featured && "min-w-[280px] max-w-[300px] shrink-0",
        className
      )}
    >
      <Link href={href} className="block">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-[hsl(350,35%,92%)] to-[hsl(30,40%,90%)]">
          {vendor.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        <div className="relative px-4 pb-4 pt-10">
          <div className="absolute -top-8 left-4 h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-white shadow">
            {vendor.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-lg font-semibold text-primary">
                {vendor.name.slice(0, 1)}
              </div>
            )}
          </div>

          <h3 className="font-semibold text-foreground group-hover:text-primary">{vendor.name}</h3>

          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs">
            <EmojiIcon icon={getIconForVendorCategory(categorySlug)} size="sm" />
            <span>{getMarketplaceCategoryLabel(categorySlug)}</span>
          </div>

          {location ? (
            <p className="mt-2 text-xs text-muted-foreground">{location}</p>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <VendorStars rating={vendor.review_avg} />
            <span className="text-xs text-muted-foreground">{reviewLabel}</span>
          </div>

          {vendor.tagline ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{vendor.tagline}</p>
          ) : null}
        </div>
      </Link>

      <div className="border-t border-border/50 px-4 py-3 space-y-2">
        {footerAction}
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={href}>{ro.marketplace.viewProfile}</Link>
        </Button>
      </div>
    </article>
  );
}
