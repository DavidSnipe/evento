-- Migration: 020_vendor_category_manage.sql
-- Custom vendor categories (INSERT/DELETE non-system rows only)

DROP POLICY IF EXISTS "Editors insert custom vendor categories" ON public.vendor_categories;
CREATE POLICY "Editors insert custom vendor categories"
  ON public.vendor_categories FOR INSERT
  TO authenticated
  WITH CHECK (is_system = false);

DROP POLICY IF EXISTS "Editors delete custom vendor categories" ON public.vendor_categories;
CREATE POLICY "Editors delete custom vendor categories"
  ON public.vendor_categories FOR DELETE
  TO authenticated
  USING (is_system = false);

DROP POLICY IF EXISTS "Editors update custom vendor categories" ON public.vendor_categories;
CREATE POLICY "Editors update custom vendor categories"
  ON public.vendor_categories FOR UPDATE
  TO authenticated
  USING (is_system = false)
  WITH CHECK (is_system = false);
