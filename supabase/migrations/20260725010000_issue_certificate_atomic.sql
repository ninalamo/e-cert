-- ============================================================
-- Migration: Atomic certificate issuance function
-- Wraps certificate creation + attendee linking in a single
-- transaction to prevent orphaned records.
-- ============================================================

CREATE OR REPLACE FUNCTION issue_certificate_atomic(
  p_org_id UUID,
  p_event_id UUID,
  p_template_id UUID,
  p_recipient_name TEXT,
  p_recipient_email TEXT,
  p_certificate_number TEXT,
  p_expires_at TIMESTAMPTZ,
  p_metadata JSONB
) RETURNS certificates AS $$
DECLARE
  v_cert certificates%ROWTYPE;
BEGIN
  INSERT INTO certificates (
    organization_id, event_id, template_id,
    recipient_name, recipient_email, certificate_number,
    expires_at, metadata
  ) VALUES (
    p_org_id, p_event_id, p_template_id,
    p_recipient_name, p_recipient_email, p_certificate_number,
    p_expires_at, p_metadata
  )
  RETURNING * INTO v_cert;

  IF p_event_id IS NOT NULL THEN
    UPDATE event_attendees
    SET certificate_id = v_cert.id, updated_at = now()
    WHERE event_id = p_event_id
      AND email = p_recipient_email
      AND certificate_id IS NULL;
  END IF;

  RETURN v_cert;
END;
$$ LANGUAGE plpgsql;
