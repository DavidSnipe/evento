import { VendorCard } from "@/components/marketplace/vendor-card";
import type { MarketplaceVendorListItem } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";

type FeaturedVendorsRowProps = {
  vendors: MarketplaceVendorListItem[];
};

export function FeaturedVendorsRow({ vendors }: FeaturedVendorsRowProps) {
  if (vendors.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-semibold">{ro.marketplace.featured}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            featured
            profileHref={`/marketplace/${vendor.slug}`}
          />
        ))}
      </div>
    </section>
  );
}
