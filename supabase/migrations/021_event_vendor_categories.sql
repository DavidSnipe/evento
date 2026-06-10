-- Migration: 021_event_vendor_categories.sql
-- Per-event activation of vendor categories (catalog stays global)

CREATE TABLE IF NOT EXISTS public.event_vendor_categories (
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  category_slug text NOT NULL REFERENCES public.vendor_categories (slug) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, category_slug)
);

CREATE INDEX IF NOT EXISTS event_vendor_categories_event_id_idx
  ON public.event_vendor_categories (event_id);

-- Backfill: categories that already have vendors on this event
INSERT INTO public.event_vendor_categories (event_id, category_slug)
SELECT DISTINCT v.event_id, v.category_id
FROM public.vendors v
WHERE v.category_id IS NOT NULL
ON CONFLICT (event_id, category_slug) DO NOTHING;

ALTER TABLE public.event_vendor_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view event vendor categories" ON public.event_vendor_categories;
CREATE POLICY "Members view event vendor categories"
  ON public.event_vendor_categories FOR SELECT
  TO authenticated
  USING (public.user_has_event_access (event_id));

DROP POLICY IF EXISTS "Editors manage event vendor categories" ON public.event_vendor_categories;
CREATE POLICY "Editors manage event vendor categories"
  ON public.event_vendor_categories FOR ALL
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );
