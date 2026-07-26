-- ============================================================
-- Migration: Atomic revocation function
-- Revokes a certificate and clears the linked attendee record
-- in a single transaction.
-- ============================================================

CREATE OR REPLACE FUNCTION revoke_certificate_atomic(
  p_cert_id UUID,
  p_reason TEXT
) RETURNS void AS $$
BEGIN
  UPDATE certificates
  SET revoked_at = now(), revoke_reason = p_reason, updated_at = now()
  WHERE id = p_cert_id AND revoked_at IS NULL;

  UPDATE event_attendees
  SET certificate_id = NULL, updated_at = now()
  WHERE certificate_id = p_cert_id;
END;
$$ LANGUAGE plpgsql;
