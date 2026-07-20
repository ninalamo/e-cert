-- Migration: Configurable certificate number patterns
-- 1. Add certificate_number_pattern to events (NOT NULL, defaults to 'EPOCH' = epoch+random fallback)
-- 2. Create certificate_sequences: shared per-(org, pattern) counter so two events using the
--    same pattern draw from one counter -> no collisions, certificate_number stays globally unique.
-- 3. next_certificate_number(): atomic increment, race-safe.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS certificate_number_pattern TEXT NOT NULL DEFAULT 'EPOCH';

CREATE TABLE IF NOT EXISTS certificate_sequences (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (organization_id, pattern)
);

CREATE INDEX IF NOT EXISTS idx_cert_sequences_org ON certificate_sequences(organization_id);

CREATE OR REPLACE FUNCTION next_certificate_number(
  p_org_id UUID,
  p_pattern TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO certificate_sequences (organization_id, pattern, next_value)
  VALUES (p_org_id, p_pattern, 2)
  ON CONFLICT (organization_id, pattern)
  DO UPDATE SET next_value = certificate_sequences.next_value + 1
  RETURNING certificate_sequences.next_value INTO v_next;

  RETURN v_next;
END;
$$;
