-- Add pos_x and pos_y to seating_tables to allow dragging and absolute positioning on the canvas

ALTER TABLE public.seating_tables
  ADD COLUMN IF NOT EXISTS pos_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y numeric NOT NULL DEFAULT 0;
