-- Fix: certificate_sequences has RLS enabled but no INSERT/UPDATE policy.
-- The next_certificate_number() RPC runs as the authenticated user (SECURITY INVOKER),
-- so the INSERT ON CONFLICT is blocked by RLS.

ALTER TABLE certificate_sequences ENABLE ROW LEVEL SECURITY;

-- Staff and admins can increment sequences (INSERT/UPDATE via the RPC)
CREATE POLICY "Staff and admins manage certificate sequences" ON certificate_sequences
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );
