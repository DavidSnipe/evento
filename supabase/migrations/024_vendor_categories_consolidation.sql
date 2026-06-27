-- Migration: 024_vendor_categories_consolidation.sql
-- Consolidate system vendor categories (7) + vendor_service_templates catalog

-- Step 1: Ensure target category slugs exist before remapping FKs
INSERT INTO public.vendor_categories (slug, label_key, sort_order, is_system) VALUES
  ('venue', 'vendors.categories.venue', 10, true),
  ('food_drink', 'vendors.categories.food_drink', 20, true),
  ('photo_video', 'vendors.categories.photo_video', 30, true),
  ('music_entertainment', 'vendors.categories.music_entertainment', 40, true),
  ('decor_flowers', 'vendors.categories.decor_flowers', 50, true),
  ('transport', 'vendors.categories.transport', 60, true),
  ('other', 'vendors.categories.other', 999, true)
ON CONFLICT (slug) DO UPDATE SET
  label_key = EXCLUDED.label_key,
  sort_order = EXCLUDED.sort_order,
  is_system = true;

-- Step 2: Remap dependent rows (old system slugs -> new slugs)

UPDATE public.vendors SET category_id = 'venue'
WHERE category_id IN ('venue', 'accommodation');

UPDATE public.vendors SET category_id = 'food_drink'
WHERE category_id IN ('catering', 'cake', 'candy_bar');

UPDATE public.vendors SET category_id = 'photo_video'
WHERE category_id IN ('photographer', 'videographer', 'photo_booth');

UPDATE public.vendors SET category_id = 'music_entertainment'
WHERE category_id IN ('dj', 'band');

UPDATE public.vendors SET category_id = 'decor_flowers'
WHERE category_id IN ('decorations', 'florist');

UPDATE public.vendors SET category_id = 'transport'
WHERE category_id IN ('transportation');

UPDATE public.vendors SET category_id = 'other'
WHERE category_id IN ('invitations', 'makeup', 'hair', 'wedding_planner');

UPDATE public.event_vendor_services SET category_slug = 'venue'
WHERE category_slug IN ('venue', 'accommodation');

UPDATE public.event_vendor_services SET category_slug = 'food_drink'
WHERE category_slug IN ('catering', 'cake', 'candy_bar');

UPDATE public.event_vendor_services SET category_slug = 'photo_video'
WHERE category_slug IN ('photographer', 'videographer', 'photo_booth');

UPDATE public.event_vendor_services SET category_slug = 'music_entertainment'
WHERE category_slug IN ('dj', 'band');

UPDATE public.event_vendor_services SET category_slug = 'decor_flowers'
WHERE category_slug IN ('decorations', 'florist');

UPDATE public.event_vendor_services SET category_slug = 'transport'
WHERE category_slug IN ('transportation');

UPDATE public.event_vendor_services SET category_slug = 'other'
WHERE category_slug IN ('invitations', 'makeup', 'hair', 'wedding_planner');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'budget_items'
      AND column_name = 'category_slug'
  ) THEN
    UPDATE public.budget_items SET category_slug = 'venue'
    WHERE category_slug IN ('venue', 'accommodation');

    UPDATE public.budget_items SET category_slug = 'food_drink'
    WHERE category_slug IN ('catering', 'cake', 'candy_bar');

    UPDATE public.budget_items SET category_slug = 'photo_video'
    WHERE category_slug IN ('photographer', 'videographer', 'photo_booth');

    UPDATE public.budget_items SET category_slug = 'music_entertainment'
    WHERE category_slug IN ('dj', 'band');

    UPDATE public.budget_items SET category_slug = 'decor_flowers'
    WHERE category_slug IN ('decorations', 'florist');

    UPDATE public.budget_items SET category_slug = 'transport'
    WHERE category_slug IN ('transportation');

    UPDATE public.budget_items SET category_slug = 'other'
    WHERE category_slug IN ('invitations', 'makeup', 'hair', 'wedding_planner');
  END IF;
END $$;

-- event_vendor_categories: avoid PK conflicts when multiple old slugs map to one new slug
INSERT INTO public.event_vendor_categories (event_id, category_slug)
SELECT DISTINCT evc.event_id, target.new_slug
FROM public.event_vendor_categories evc
CROSS JOIN LATERAL (
  SELECT CASE evc.category_slug
    WHEN 'venue' THEN 'venue'
    WHEN 'accommodation' THEN 'venue'
    WHEN 'catering' THEN 'food_drink'
    WHEN 'cake' THEN 'food_drink'
    WHEN 'candy_bar' THEN 'food_drink'
    WHEN 'photographer' THEN 'photo_video'
    WHEN 'videographer' THEN 'photo_video'
    WHEN 'photo_booth' THEN 'photo_video'
    WHEN 'dj' THEN 'music_entertainment'
    WHEN 'band' THEN 'music_entertainment'
    WHEN 'decorations' THEN 'decor_flowers'
    WHEN 'florist' THEN 'decor_flowers'
    WHEN 'transportation' THEN 'transport'
    WHEN 'invitations' THEN 'other'
    WHEN 'makeup' THEN 'other'
    WHEN 'hair' THEN 'other'
    WHEN 'wedding_planner' THEN 'other'
    ELSE evc.category_slug
  END AS new_slug
) AS target
WHERE evc.category_slug <> target.new_slug
ON CONFLICT (event_id, category_slug) DO NOTHING;

DELETE FROM public.event_vendor_categories evc
WHERE evc.category_slug IN (
  'photographer', 'videographer', 'photo_booth',
  'dj', 'band',
  'decorations', 'florist',
  'catering', 'cake', 'candy_bar',
  'transportation',
  'accommodation',
  'invitations', 'makeup', 'hair', 'wedding_planner'
);

-- Step 3: Remove obsolete system categories (custom categories preserved)
DELETE FROM public.vendor_categories
WHERE is_system = true
  AND slug NOT IN (
    'venue',
    'food_drink',
    'photo_video',
    'music_entertainment',
    'decor_flowers',
    'transport',
    'other'
  );

-- Step 4: vendor_service_templates catalog
CREATE TABLE IF NOT EXISTS public.vendor_service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL REFERENCES public.vendor_categories (slug) ON DELETE CASCADE,
  label_key text NOT NULL,
  icon_key text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_service_templates_category_sort_idx
  ON public.vendor_service_templates (category_slug, sort_order);

INSERT INTO public.vendor_service_templates (category_slug, label_key, icon_key, sort_order) VALUES
  ('venue', 'Sală/Locație', 'venue', 10),
  ('venue', 'Cazare invitați', 'accommodation', 20),
  ('food_drink', 'Catering', 'catering', 10),
  ('food_drink', 'Tort', 'cake', 20),
  ('food_drink', 'Candy bar', 'candy-bar', 30),
  ('food_drink', 'Open bar / Băuturi', 'catering', 40),
  ('photo_video', 'Fotograf', 'photographer', 10),
  ('photo_video', 'Videograf', 'videographer', 20),
  ('photo_video', 'Drone / Aerial', 'videographer', 30),
  ('music_entertainment', 'DJ', 'music', 10),
  ('music_entertainment', 'Formație / Band', 'band', 20),
  ('music_entertainment', 'Artiști speciali', 'music', 30),
  ('decor_flowers', 'Florărie', 'florist', 10),
  ('decor_flowers', 'Decor sală', 'decor', 20),
  ('decor_flowers', 'Lumânări / Lumini', 'decor', 30),
  ('transport', 'Transport miri', 'transport', 10),
  ('transport', 'Transport invitați', 'group-transport', 20);

ALTER TABLE public.vendor_service_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read vendor service templates" ON public.vendor_service_templates;
CREATE POLICY "Authenticated read vendor service templates"
  ON public.vendor_service_templates FOR SELECT
  TO authenticated
  USING (true);