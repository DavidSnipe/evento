import type { MarketplacePortfolioMediaType } from "@/types/marketplace";

export type MarketplaceVendorCategoryInput = {
  category_slug: string;
  is_primary: boolean;
};

export type MarketplaceVendorPackageInput = {
  id?: string;
  category_slug: string | null;
  name: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  price_currency: string;
  price_label: string | null;
  price_is_visible: boolean;
  sort_order: number;
};

export type MarketplaceVendorPortfolioInput = {
  id?: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  media_type: MarketplacePortfolioMediaType;
  sort_order: number;
};

export type MarketplaceVendorSaveInput = {
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  location_city: string | null;
  location_county: string | null;
  location_country: string;
  is_published: boolean;
  is_featured: boolean;
  is_claimed: boolean;
  owner_id: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  categories: MarketplaceVendorCategoryInput[];
  packages: MarketplaceVendorPackageInput[];
  portfolio: MarketplaceVendorPortfolioInput[];
};
