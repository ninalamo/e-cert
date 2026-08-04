-- Migration: Conditional UNIQUE index for certificate_number
-- Purpose: Allow re-issuance with same number after revocation while preserving audit trail
-- 
-- Before: UNIQUE constraint on certificate_number blocked re-issuance after revocation
-- After:  Only active (non-revoked) certificates need unique numbers

-- 1. Drop the existing inline UNIQUE constraint
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_certificate_number_key;

-- 2. Add conditional unique index: only active certs need unique numbers
-- This allows revoked certificates to keep their number for audit trail
-- while enabling re-issuance with the same number after revocation
CREATE UNIQUE INDEX IF NOT EXISTS certificates_number_active_unique
  ON certificates (certificate_number)
  WHERE revoked_at IS NULL;

-- 3. Backfill certificate_number on event_attendees from existing certificates
-- This ensures attendees have their certificate number preserved
UPDATE event_attendees ea
SET certificate_number = c.certificate_number
FROM certificates c
WHERE ea.certificate_id = c.id
  AND ea.certificate_number IS NULL;
