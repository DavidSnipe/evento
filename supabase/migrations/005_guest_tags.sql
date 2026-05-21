-- Add tags support to guests table
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_guests_tags ON public.guests USING GIN (tags);
