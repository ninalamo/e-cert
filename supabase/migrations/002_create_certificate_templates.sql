CREATE TABLE certificate_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  css_content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org templates" ON certificate_templates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Org admins can manage templates" ON certificate_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE INDEX idx_cert_templates_org ON certificate_templates(organization_id);
