-- Add geolocation columns to page_views table
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS city TEXT;
