-- ============================================================
-- Migration: Prevent duplicate certificate issuance
-- Adds a unique constraint on (event_id, recipient_email) so
-- the same person cannot receive two certificates for the same event.
-- Safe to re-run: uses IF NOT EXISTS pattern.
-- ============================================================

-- 1. Remove duplicates, keeping only the oldest certificate per (event_id, recipient_email)
DELETE FROM certificates
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY event_id, recipient_email
        ORDER BY created_at ASC
      ) AS rn
    FROM certificates
    WHERE event_id IS NOT NULL
  ) dup
  WHERE dup.rn > 1
);

-- 2. Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS certificates_event_email_unique
  ON certificates (event_id, recipient_email)
  WHERE event_id IS NOT NULL;
