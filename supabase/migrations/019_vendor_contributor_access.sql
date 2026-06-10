-- Migration: 019_vendor_contributor_access.sql
-- Contributors may add/edit vendors and offers; editors retain delete.

-- vendors
DROP POLICY IF EXISTS "Editors manage vendors" ON public.vendors;

DROP POLICY IF EXISTS "Contributors insert vendors" ON public.vendors;
CREATE POLICY "Contributors insert vendors"
  ON public.vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor', 'contributor'])
  );

DROP POLICY IF EXISTS "Contributors update vendors" ON public.vendors;
CREATE POLICY "Contributors update vendors"
  ON public.vendors FOR UPDATE
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor', 'contributor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor', 'contributor'])
  );

DROP POLICY IF EXISTS "Editors delete vendors" ON public.vendors;
CREATE POLICY "Editors delete vendors"
  ON public.vendors FOR DELETE
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );

-- vendor_offers
DROP POLICY IF EXISTS "Editors manage vendor offers" ON public.vendor_offers;

DROP POLICY IF EXISTS "Contributors insert vendor offers" ON public.vendor_offers;
CREATE POLICY "Contributors insert vendor offers"
  ON public.vendor_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor', 'contributor'])
  );

DROP POLICY IF EXISTS "Contributors update vendor offers" ON public.vendor_offers;
CREATE POLICY "Contributors update vendor offers"
  ON public.vendor_offers FOR UPDATE
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor', 'contributor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor', 'contributor'])
  );

DROP POLICY IF EXISTS "Editors delete vendor offers" ON public.vendor_offers;
CREATE POLICY "Editors delete vendor offers"
  ON public.vendor_offers FOR DELETE
  TO authenticated
  USING (
    public.user_can_edit_with_roles (event_id, ARRAY['owner', 'editor'])
  );
