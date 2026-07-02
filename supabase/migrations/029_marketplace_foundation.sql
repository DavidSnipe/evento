-- Migration: 029_marketplace_foundation.sql
-- Vendor Marketplace foundation: profiles, marketplace vendors, packages, portfolio, reviews, availability, quote requests
-- Safe to re-run: IF NOT EXISTS + DROP POLICY IF EXISTS

-- ---------------------------------------------------------------------------
-- 1. Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_vendor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_planner boolean NOT NULL DEFAULT true;

-- Backfill profiles for existing auth users
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Admin helper (avoids recursive RLS on profiles)
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_admin() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.user_is_admin());

-- ---------------------------------------------------------------------------
-- 3. marketplace_vendors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  tagline text,
  description text,
  email text,
  phone text,
  website text,
  location_city text,
  location_county text,
  location_country text NOT NULL DEFAULT 'RO',
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_claimed boolean NOT NULL DEFAULT false,
  logo_url text,
  cover_image_url text,
  review_count int NOT NULL DEFAULT 0,
  review_avg numeric(3, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_vendors_slug_unique UNIQUE (slug),
  CONSTRAINT marketplace_vendors_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT marketplace_vendors_review_count_nonneg CHECK (review_count >= 0),
  CONSTRAINT marketplace_vendors_review_avg_range CHECK (
    review_avg IS NULL OR (review_avg >= 1 AND review_avg <= 5)
  )
);

-- Marketplace access helpers (must run after marketplace_vendors exists)
CREATE OR REPLACE FUNCTION public.marketplace_vendor_is_published(p_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT mv.is_published
      FROM public.marketplace_vendors mv
      WHERE mv.id = p_vendor_id
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_vendor_owned_by_auth(p_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.marketplace_vendors mv
    WHERE mv.id = p_vendor_id
      AND mv.owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_vendor_is_published(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_vendor_owned_by_auth(uuid) TO authenticated;

DROP TRIGGER IF EXISTS marketplace_vendors_updated_at ON public.marketplace_vendors;
CREATE TRIGGER marketplace_vendors_updated_at
  BEFORE UPDATE ON public.marketplace_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS marketplace_vendors_slug_idx
  ON public.marketplace_vendors (slug);

CREATE INDEX IF NOT EXISTS marketplace_vendors_published_idx
  ON public.marketplace_vendors (is_published)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS marketplace_vendors_featured_idx
  ON public.marketplace_vendors (is_featured)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS marketplace_vendors_owner_id_idx
  ON public.marketplace_vendors (owner_id)
  WHERE owner_id IS NOT NULL;

ALTER TABLE public.marketplace_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published vendors" ON public.marketplace_vendors;
CREATE POLICY "Public can view published vendors"
  ON public.marketplace_vendors FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Vendor can view own profile" ON public.marketplace_vendors;
CREATE POLICY "Vendor can view own profile"
  ON public.marketplace_vendors FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Vendor can insert own profile" ON public.marketplace_vendors;
CREATE POLICY "Vendor can insert own profile"
  ON public.marketplace_vendors FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Vendor can update own profile" ON public.marketplace_vendors;
CREATE POLICY "Vendor can update own profile"
  ON public.marketplace_vendors FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() AND is_claimed = true)
  WITH CHECK (owner_id = auth.uid() AND is_claimed = true);

DROP POLICY IF EXISTS "Admin full access marketplace vendors" ON public.marketplace_vendors;
CREATE POLICY "Admin full access marketplace vendors"
  ON public.marketplace_vendors FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- ---------------------------------------------------------------------------
-- 4. marketplace_vendor_categories (reuses global vendor_categories catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_vendor_categories (
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors (id) ON DELETE CASCADE,
  category_slug text NOT NULL REFERENCES public.vendor_categories (slug) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (vendor_id, category_slug)
);

CREATE INDEX IF NOT EXISTS marketplace_vendor_categories_cat_idx
  ON public.marketplace_vendor_categories (category_slug);

ALTER TABLE public.marketplace_vendor_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories for published vendors" ON public.marketplace_vendor_categories;
CREATE POLICY "Public read categories for published vendors"
  ON public.marketplace_vendor_categories FOR SELECT
  TO anon, authenticated
  USING (public.marketplace_vendor_is_published(vendor_id));

DROP POLICY IF EXISTS "Vendor manages own categories" ON public.marketplace_vendor_categories;
CREATE POLICY "Vendor manages own categories"
  ON public.marketplace_vendor_categories FOR ALL
  TO authenticated
  USING (public.marketplace_vendor_owned_by_auth(vendor_id))
  WITH CHECK (public.marketplace_vendor_owned_by_auth(vendor_id));

DROP POLICY IF EXISTS "Admin full access marketplace vendor categories" ON public.marketplace_vendor_categories;
CREATE POLICY "Admin full access marketplace vendor categories"
  ON public.marketplace_vendor_categories FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- ---------------------------------------------------------------------------
-- 5. marketplace_vendor_packages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_vendor_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors (id) ON DELETE CASCADE,
  category_slug text REFERENCES public.vendor_categories (slug) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price_from numeric(10, 2),
  price_to numeric(10, 2),
  price_currency text NOT NULL DEFAULT 'RON',
  price_label text,
  price_is_visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_vendor_packages_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS marketplace_vendor_packages_vendor_idx
  ON public.marketplace_vendor_packages (vendor_id, sort_order);

ALTER TABLE public.marketplace_vendor_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read packages for published vendors" ON public.marketplace_vendor_packages;
CREATE POLICY "Public read packages for published vendors"
  ON public.marketplace_vendor_packages FOR SELECT
  TO anon, authenticated
  USING (public.marketplace_vendor_is_published(vendor_id));

DROP POLICY IF EXISTS "Vendor manages own packages" ON public.marketplace_vendor_packages;
CREATE POLICY "Vendor manages own packages"
  ON public.marketplace_vendor_packages FOR ALL
  TO authenticated
  USING (public.marketplace_vendor_owned_by_auth(vendor_id))
  WITH CHECK (public.marketplace_vendor_owned_by_auth(vendor_id));

DROP POLICY IF EXISTS "Admin full access marketplace vendor packages" ON public.marketplace_vendor_packages;
CREATE POLICY "Admin full access marketplace vendor packages"
  ON public.marketplace_vendor_packages FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- ---------------------------------------------------------------------------
-- 6. marketplace_vendor_portfolio
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_vendor_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors (id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  caption text,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_vendor_portfolio_url_nonempty CHECK (char_length(trim(url)) > 0)
);

CREATE INDEX IF NOT EXISTS marketplace_vendor_portfolio_vendor_idx
  ON public.marketplace_vendor_portfolio (vendor_id, sort_order);

ALTER TABLE public.marketplace_vendor_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read portfolio for published vendors" ON public.marketplace_vendor_portfolio;
CREATE POLICY "Public read portfolio for published vendors"
  ON public.marketplace_vendor_portfolio FOR SELECT
  TO anon, authenticated
  USING (public.marketplace_vendor_is_published(vendor_id));

DROP POLICY IF EXISTS "Vendor manages own portfolio" ON public.marketplace_vendor_portfolio;
CREATE POLICY "Vendor manages own portfolio"
  ON public.marketplace_vendor_portfolio FOR ALL
  TO authenticated
  USING (public.marketplace_vendor_owned_by_auth(vendor_id))
  WITH CHECK (public.marketplace_vendor_owned_by_auth(vendor_id));

DROP POLICY IF EXISTS "Admin full access marketplace vendor portfolio" ON public.marketplace_vendor_portfolio;
CREATE POLICY "Admin full access marketplace vendor portfolio"
  ON public.marketplace_vendor_portfolio FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- ---------------------------------------------------------------------------
-- 7. marketplace_vendor_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_vendor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors (id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  reviewer_name text NOT NULL,
  event_year int,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_vendor_reviews_reviewer_name_nonempty CHECK (char_length(trim(reviewer_name)) > 0)
);

CREATE INDEX IF NOT EXISTS marketplace_vendor_reviews_vendor_idx
  ON public.marketplace_vendor_reviews (vendor_id)
  WHERE is_approved = true;

ALTER TABLE public.marketplace_vendor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews" ON public.marketplace_vendor_reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.marketplace_vendor_reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

DROP POLICY IF EXISTS "Users can create reviews" ON public.marketplace_vendor_reviews;
CREATE POLICY "Users can create reviews"
  ON public.marketplace_vendor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin manages reviews" ON public.marketplace_vendor_reviews;
CREATE POLICY "Admin manages reviews"
  ON public.marketplace_vendor_reviews FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- ---------------------------------------------------------------------------
-- 8. marketplace_vendor_availability
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_vendor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors (id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'unavailable' CHECK (status IN ('available', 'unavailable', 'tentative')),
  note text,
  CONSTRAINT marketplace_vendor_availability_vendor_date_unique UNIQUE (vendor_id, date)
);

CREATE INDEX IF NOT EXISTS marketplace_vendor_availability_vendor_date_idx
  ON public.marketplace_vendor_availability (vendor_id, date);

ALTER TABLE public.marketplace_vendor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read availability for published vendors" ON public.marketplace_vendor_availability;
CREATE POLICY "Public read availability for published vendors"
  ON public.marketplace_vendor_availability FOR SELECT
  TO anon, authenticated
  USING (public.marketplace_vendor_is_published(vendor_id));

DROP POLICY IF EXISTS "Vendor manages own availability" ON public.marketplace_vendor_availability;
CREATE POLICY "Vendor manages own availability"
  ON public.marketplace_vendor_availability FOR ALL
  TO authenticated
  USING (public.marketplace_vendor_owned_by_auth(vendor_id))
  WITH CHECK (public.marketplace_vendor_owned_by_auth(vendor_id));

DROP POLICY IF EXISTS "Admin full access marketplace vendor availability" ON public.marketplace_vendor_availability;
CREATE POLICY "Admin full access marketplace vendor availability"
  ON public.marketplace_vendor_availability FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- ---------------------------------------------------------------------------
-- 9. marketplace_quote_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors (id) ON DELETE CASCADE,
  requester_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  event_date date,
  event_location text,
  guest_count int,
  package_id uuid REFERENCES public.marketplace_vendor_packages (id) ON DELETE SET NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'viewed', 'responded', 'declined', 'accepted')
  ),
  vendor_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_quote_requests_name_nonempty CHECK (char_length(trim(requester_name)) > 0),
  CONSTRAINT marketplace_quote_requests_email_nonempty CHECK (char_length(trim(requester_email)) > 0),
  CONSTRAINT marketplace_quote_requests_message_nonempty CHECK (char_length(trim(message)) > 0),
  CONSTRAINT marketplace_quote_requests_guest_count_positive CHECK (
    guest_count IS NULL OR guest_count > 0
  )
);

CREATE INDEX IF NOT EXISTS marketplace_quote_requests_vendor_idx
  ON public.marketplace_quote_requests (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS marketplace_quote_requests_requester_idx
  ON public.marketplace_quote_requests (requester_id)
  WHERE requester_id IS NOT NULL;

ALTER TABLE public.marketplace_quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requester can view own requests" ON public.marketplace_quote_requests;
CREATE POLICY "Requester can view own requests"
  ON public.marketplace_quote_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can create quote request" ON public.marketplace_quote_requests;
CREATE POLICY "Anyone can create quote request"
  ON public.marketplace_quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Vendor can view requests for their vendor" ON public.marketplace_quote_requests;
CREATE POLICY "Vendor can view requests for their vendor"
  ON public.marketplace_quote_requests FOR SELECT
  TO authenticated
  USING (public.marketplace_vendor_owned_by_auth(vendor_id));

DROP POLICY IF EXISTS "Vendor can update status/response" ON public.marketplace_quote_requests;
CREATE POLICY "Vendor can update status/response"
  ON public.marketplace_quote_requests FOR UPDATE
  TO authenticated
  USING (public.marketplace_vendor_owned_by_auth(vendor_id))
  WITH CHECK (public.marketplace_vendor_owned_by_auth(vendor_id));

DROP POLICY IF EXISTS "Admin full access to requests" ON public.marketplace_quote_requests;
CREATE POLICY "Admin full access to requests"
  ON public.marketplace_quote_requests FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());
