CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES certificate_templates(id),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  certificate_number TEXT UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org certificates" ON certificates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Org admins can manage certificates" ON certificates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE INDEX idx_certificates_org ON certificates(organization_id);
CREATE INDEX idx_certificates_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_email ON certificates(recipient_email);
