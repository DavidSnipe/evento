/** User profile row (extends auth.users). */
export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_admin: boolean;
  is_vendor: boolean;
  is_planner: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketplaceVendor = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location_city: string | null;
  location_county: string | null;
  location_country: string;
  is_published: boolean;
  is_featured: boolean;
  is_claimed: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  review_count: number;
  review_avg: number | null;
  created_at: string;
  updated_at: string;
};

export type MarketplaceVendorCategory = {
  vendor_id: string;
  category_slug: string;
  is_primary: boolean;
};

export type MarketplaceVendorPackage = {
  id: string;
  vendor_id: string;
  category_slug: string | null;
  name: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  price_currency: string;
  price_label: string | null;
  price_is_visible: boolean;
  sort_order: number;
  created_at: string;
};

export type MarketplacePortfolioMediaType = "image" | "video";

export type MarketplaceVendorPortfolio = {
  id: string;
  vendor_id: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  media_type: MarketplacePortfolioMediaType;
  sort_order: number;
  created_at: string;
};

export type MarketplaceVendorReview = {
  id: string;
  vendor_id: string;
  reviewer_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string;
  event_year: number | null;
  is_approved: boolean;
  created_at: string;
};

export type MarketplaceAvailabilityStatus = "available" | "unavailable" | "tentative";

export type MarketplaceVendorAvailability = {
  id: string;
  vendor_id: string;
  date: string;
  status: MarketplaceAvailabilityStatus;
  note: string | null;
};

export const MARKETPLACE_QUOTE_STATUSES = [
  "pending",
  "viewed",
  "responded",
  "declined",
  "accepted",
] as const;

export type MarketplaceQuoteStatus = (typeof MARKETPLACE_QUOTE_STATUSES)[number];

export type MarketplaceQuoteRequest = {
  id: string;
  vendor_id: string;
  requester_id: string | null;
  event_id: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  event_date: string | null;
  event_location: string | null;
  guest_count: number | null;
  package_id: string | null;
  message: string;
  status: MarketplaceQuoteStatus;
  vendor_response: string | null;
  responded_at: string | null;
  created_at: string;
};

/** Marketplace vendor with joined category slugs (common list/detail shape). */
export type MarketplaceVendorWithCategories = MarketplaceVendor & {
  categories: MarketplaceVendorCategory[];
  primary_category_slug: string | null;
};
