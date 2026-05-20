-- Evento: seating table enhancements — shape, color, notes
-- Run after 002_guests_seating.sql

ALTER TABLE public.seating_tables
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'round'
    CHECK (shape IN ('round', 'rectangular', 'sweetheart')),
  ADD COLUMN IF NOT EXISTS color_tag text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;
