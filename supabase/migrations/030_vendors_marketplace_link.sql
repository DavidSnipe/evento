-- Migration: 030_vendors_marketplace_link.sql
-- Link event-level vendors to marketplace vendor profiles.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS marketplace_vendor_id uuid
  REFERENCES public.marketplace_vendors (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS vendors_marketplace_vendor_id_idx
  ON public.vendors (marketplace_vendor_id)
  WHERE marketplace_vendor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vendors_event_marketplace_vendor_unique
  ON public.vendors (event_id, marketplace_vendor_id)
  WHERE marketplace_vendor_id IS NOT NULL;
