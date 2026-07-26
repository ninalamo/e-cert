-- ============================================================
-- Migration: Prevent duplicate certificate issuance
-- Adds a unique constraint on (event_id, recipient_email) so
-- the same person cannot receive two certificates for the same event.
-- Safe to re-run: uses IF NOT EXISTS pattern.
-- ============================================================

-- Only apply when event_id is NOT NULL (standalone certs without events are fine)
CREATE UNIQUE INDEX IF NOT EXISTS certificates_event_email_unique
  ON certificates (event_id, recipient_email)
  WHERE event_id IS NOT NULL;
