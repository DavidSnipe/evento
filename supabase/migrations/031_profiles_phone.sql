-- Migration: 031_profiles_phone.sql
-- Optional phone on user profiles for account settings

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;
