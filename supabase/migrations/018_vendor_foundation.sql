-- Migration: 018_vendor_foundation.sql
-- Phase 6.1 — Vendor categories, offers, selection, contracts & payments foundation

-- ─── System vendor categories (extensible catalog) ───
CREATE TABLE IF NOT EXISTS public.vendor_categories (
  slug text PRIMARY KEY,
  label_key text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.vendor_categories (slug, label_key, sort_order) VALUES
  ('venue', 'vendors.categories.venue', 10),
  ('photographer', 'vendors.categories.photographer', 20),
  ('videographer', 'vendors.categories.videographer', 30),
  ('dj', 'vendors.categories.dj', 40),
  ('band', 'vendors.categories.band', 50),
  ('decorations', 'vendors.categories.decorations', 60),
  ('florist', 'vendors.categories.florist', 70),
  ('catering', 'vendors.categories.catering', 80),
  ('cake', 'vendors.categories.cake', 90),
  ('candy_bar', 'vendors.categories.candyBar', 100),
  ('photo_booth', 'vendors.categories.photoBooth', 110),
  ('transportation', 'vendors.categories.transportation', 120),
  ('accommodation', 'vendors.categories.accommodation', 130),
  ('invitations', 'vendors.categories.invitations', 140),
  ('makeup', 'vendors.categories.makeup', 150),
  ('hair', 'vendors.categories.hair', 160),
  ('wedding_planner', 'vendors.categories.weddingPlanner', 170),
  ('other', 'vendors.categories.other', 999)
ON CONFLICT (slug) DO NOTHING;

-- ─── Extend event vendors ───
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS category_id text REFERENCES public.vendor_categories (slug),
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS selected_offer_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Map legacy free-text category → catalog slug
UPDATE public.vendors v
SET category_id = CASE
  WHEN lower(trim(v.category)) IN ('locație', 'locatie', 'venue', 'sala') THEN 'venue'
  WHEN lower(trim(v.category)) LIKE '%foto%' AND lower(trim(v.category)) LIKE '%video%' THEN 'photographer'
  WHEN lower(trim(v.category)) LIKE '%foto%' THEN 'photographer'
  WHEN lower(trim(v.category)) LIKE '%video%' THEN 'videographer'
  WHEN lower(trim(v.category)) IN ('dj', 'muzică', 'muzica') THEN 'dj'
  WHEN lower(trim(v.category)) LIKE '%catering%' OR lower(trim(v.category)) LIKE '%masă%' THEN 'catering'
  WHEN lower(trim(v.category)) LIKE '%flor%' THEN 'florist'
  WHEN lower(trim(v.category)) LIKE '%decor%' THEN 'decorations'
  ELSE 'other'
END
WHERE v.category_id IS NULL AND v.category IS NOT NULL;

UPDATE public.vendors SET category_id = 'other' WHERE category_id IS NULL;

-- Map legacy status values → pipeline statuses
UPDATE public.vendors SET status = 'contacted'
  WHERE status IN ('contactat', 'contacted');
UPDATE public.vendors SET status = 'selected'
  WHERE status IN ('confirmat', 'confirmed');
UPDATE public.vendors SET status = 'rejected'
  WHERE status IN ('anulat', 'refuzat', 'rejected');
UPDATE public.vendors SET status = 'negotiating'
  WHERE status IN ('avans_platit', 'avans');
UPDATE public.vendors SET status = 'researching'
  WHERE status IS NULL OR status = '';

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_status_check;

UPDATE public.vendors SET status = 'researching'
  WHERE status IS NULL
     OR status NOT IN (
       'researching',
       'contacted',
       'offer_received',
       'negotiating',
       'selected',
       'rejected',
       'contract_signed'
     );

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_status_check CHECK (
    status IN (
      'researching',
      'contacted',
      'offer_received',
      'negotiating',
      'selected',
      'rejected',
      'contract_signed'
    )
  );

ALTER TABLE public.vendors ALTER COLUMN status SET DEFAULT 'researching';

DROP TRIGGER IF EXISTS vendors_updated_at ON public.vendors;
CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Vendor offers (multiple per vendor) ───
CREATE TABLE IF NOT EXISTS public.vendor_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  title text NOT NULL,
  price numeric(12, 2),
  currency text NOT NULL DEFAULT 'RON',
  description text,
  included_services text,
  offer_date date,
  expiry_date date,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_offers_vendor_id_idx ON public.vendor_offers (vendor_id);
CREATE INDEX IF NOT EXISTS vendor_offers_event_id_idx ON public.vendor_offers (event_id);

DROP TRIGGER IF EXISTS vendor_offers_updated_at ON public.vendor_offers;
CREATE TRIGGER vendor_offers_updated_at
  BEFORE UPDATE ON public.vendor_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Selected offer FK (after offers table exists)
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_selected_offer_id_fkey;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_selected_offer_id_fkey
  FOREIGN KEY (selected_offer_id) REFERENCES public.vendor_offers (id) ON DELETE SET NULL;

-- ─── Contract foundation (one row per vendor) ───
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL UNIQUE REFERENCES public.vendors (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  contract_value numeric(12, 2),
  contract_currency text NOT NULL DEFAULT 'RON',
  contract_date date,
  contract_signed boolean NOT NULL DEFAULT false,
  attachment_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_contracts_event_id_idx ON public.vendor_contracts (event_id);

DROP TRIGGER IF EXISTS vendor_contracts_updated_at ON public.vendor_contracts;
CREATE TRIGGER vendor_contracts_updated_at
  BEFORE UPDATE ON public.vendor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Payment foundation ───
CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.vendor_offers (id) ON DELETE SET NULL,
  payment_type text NOT NULL CHECK (
    payment_type IN ('deposit', 'intermediate', 'final_payment')
  ),
  planned_amount numeric(12, 2) NOT NULL DEFAULT 0,
  paid_amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'RON',
  due_date date,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_payments_vendor_id_idx ON public.vendor_payments (vendor_id);
CREATE INDEX IF NOT EXISTS vendor_payments_event_id_idx ON public.vendor_payments (event_id);

DROP TRIGGER IF EXISTS vendor_payments_updated_at ON public.vendor_payments;
CREATE TRIGGER vendor_payments_updated_at
  BEFORE UPDATE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Future timeline hook registry (no automation yet) ───
CREATE TABLE IF NOT EXISTS public.vendor_timeline_hook_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE CASCADE,
  hook_type text NOT NULL CHECK (
    hook_type IN (
      'vendor_selected',
      'deposit_due',
      'final_payment_due',
      'contract_signed'
    )
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_timeline_hook_queue_event_id_idx
  ON public.vendor_timeline_hook_queue (event_id)
  WHERE processed_at IS NULL;

-- ─── RLS: vendor_categories (read-only for authenticated) ───
ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read vendor categories" ON public.vendor_categories;
CREATE POLICY "Authenticated read vendor categories"
  ON public.vendor_categories FOR SELECT
  TO authenticated
  USING (true);

-- ─── RLS: vendors — members read, editors manage ───
DROP POLICY IF EXISTS "Users can manage vendors for their events" ON public.vendors;
DROP POLICY IF EXISTS "Collaborators manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Members can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Editors manage vendors" ON public.vendors;

CREATE POLICY "Members can view vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (public.user_has_event_access (event_id));

CREATE POLICY "Editors manage vendors"
  ON public.vendors FOR ALL
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );

-- ─── RLS helper for child tables ───
CREATE OR REPLACE FUNCTION public.vendor_child_event_id(p_vendor_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_id FROM public.vendors WHERE id = p_vendor_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.vendor_child_event_id(uuid) TO authenticated;

-- vendor_offers
ALTER TABLE public.vendor_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view vendor offers" ON public.vendor_offers;
DROP POLICY IF EXISTS "Editors manage vendor offers" ON public.vendor_offers;

CREATE POLICY "Members can view vendor offers"
  ON public.vendor_offers FOR SELECT
  TO authenticated
  USING (public.user_has_event_access (event_id));

CREATE POLICY "Editors manage vendor offers"
  ON public.vendor_offers FOR ALL
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );

-- vendor_contracts
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view vendor contracts" ON public.vendor_contracts;
DROP POLICY IF EXISTS "Editors manage vendor contracts" ON public.vendor_contracts;

CREATE POLICY "Members can view vendor contracts"
  ON public.vendor_contracts FOR SELECT
  TO authenticated
  USING (public.user_has_event_access (event_id));

CREATE POLICY "Editors manage vendor contracts"
  ON public.vendor_contracts FOR ALL
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );

-- vendor_payments
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view vendor payments" ON public.vendor_payments;
DROP POLICY IF EXISTS "Editors manage vendor payments" ON public.vendor_payments;

CREATE POLICY "Members can view vendor payments"
  ON public.vendor_payments FOR SELECT
  TO authenticated
  USING (public.user_has_event_access (event_id));

CREATE POLICY "Editors manage vendor payments"
  ON public.vendor_payments FOR ALL
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );

-- vendor_timeline_hook_queue (editors only; processing deferred)
ALTER TABLE public.vendor_timeline_hook_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view vendor timeline hooks" ON public.vendor_timeline_hook_queue;
DROP POLICY IF EXISTS "Editors manage vendor timeline hooks" ON public.vendor_timeline_hook_queue;

CREATE POLICY "Members can view vendor timeline hooks"
  ON public.vendor_timeline_hook_queue FOR SELECT
  TO authenticated
  USING (public.user_has_event_access (event_id));

CREATE POLICY "Editors manage vendor timeline hooks"
  ON public.vendor_timeline_hook_queue FOR ALL
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );
