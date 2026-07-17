CREATE TABLE certificate_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  sent_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

ALTER TABLE certificate_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view email logs" ON certificate_emails
  FOR SELECT USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id IN (
        SELECT organization_id FROM user_memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_certificate_emails_cert ON certificate_emails(certificate_id);
