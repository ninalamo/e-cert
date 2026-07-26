-- Migration: Cascade delete certificates when an event is deleted
-- certificates.event_id currently has no ON DELETE action, so deleting an
-- event with issued certificates fails the foreign-key constraint.
-- Run this against your Supabase database (SQL Editor or CLI).

ALTER TABLE certificates
  DROP CONSTRAINT IF EXISTS certificates_event_id_fkey;

ALTER TABLE certificates
  ADD CONSTRAINT certificates_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- RLS policies (e.g. certificates "Members can read org certificates") reference
-- auth.users, so the authenticated role needs SELECT on it; otherwise writes that
-- re-evaluate those policies fail with "permission denied for table users".
GRANT SELECT ON auth.users TO authenticated;
