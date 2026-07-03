-- Migration: 036_gallery_favorites.sql
-- Favorite flag on gallery media uploads

ALTER TABLE media_uploads
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
