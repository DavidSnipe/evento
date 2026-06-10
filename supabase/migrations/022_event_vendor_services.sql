-- Migration: 022_event_vendor_services.sql
-- Per-category services (e.g. Buchet mireasă, Flori mese) with scoped selection

CREATE TABLE IF NOT EXISTS public.event_vendor_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  category_slug text NOT NULL REFERENCES public.vendor_categories (slug) ON DELETE CASCADE,
  name text NOT NULL,
  selected_offer_id uuid REFERENCES public.vendor_offers (id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_vendor_services_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS event_vendor_services_event_category_idx
  ON public.event_vendor_services (event_id, category_slug, sort_order);

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.event_vendor_services (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS vendors_service_id_idx
  ON public.vendors (service_id);

-- One default service per event+category for existing vendor rows
INSERT INTO public.event_vendor_services (event_id, category_slug, name, sort_order)
SELECT DISTINCT v.event_id, v.category_id, 'Serviciu principal', 0
FROM public.vendors v
WHERE v.category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.event_vendor_services s
    WHERE s.event_id = v.event_id
      AND s.category_slug = v.category_id
  );

UPDATE public.vendors v
SET service_id = s.id
FROM public.event_vendor_services s
WHERE v.service_id IS NULL
  AND v.category_id IS NOT NULL
  AND v.event_id = s.event_id
  AND v.category_id = s.category_slug;

UPDATE public.event_vendor_services s
SET selected_offer_id = v.selected_offer_id
FROM public.vendors v
WHERE v.service_id = s.id
  AND v.selected_offer_id IS NOT NULL
  AND s.selected_offer_id IS NULL;

ALTER TABLE public.event_vendor_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view event vendor services" ON public.event_vendor_services;
CREATE POLICY "Members view event vendor services"
  ON public.event_vendor_services FOR SELECT
  TO authenticated
  USING (public.user_has_event_access (event_id));

DROP POLICY IF EXISTS "Editors manage event vendor services" ON public.event_vendor_services;
CREATE POLICY "Editors manage event vendor services"
  ON public.event_vendor_services FOR ALL
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );
