-- Migration: Rename event statuses
-- published -> active, completed -> archive
-- Run this against your Supabase database (SQL Editor or CLI)

-- 1. Migrate existing data
UPDATE events SET status = 'active' WHERE status = 'published';
UPDATE events SET status = 'archive' WHERE status = 'completed';

-- 2. Drop old CHECK constraint, add new one
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'active', 'archive'));
