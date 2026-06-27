-- Migration: 023_budget_target_category_slug.sql
-- Event budget target + link manual budget rows to vendor category slugs

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS budget_target numeric(10, 2);

ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS category_slug text REFERENCES public.vendor_categories (slug);

CREATE INDEX IF NOT EXISTS budget_items_category_slug_idx
  ON public.budget_items (event_id, category_slug);

UPDATE public.budget_items
SET category_slug = 'other'
WHERE category_slug IS NULL;
