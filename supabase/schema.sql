-- ============================================================
-- E-Cert — Full Schema + Seed Data
-- Run this single file to set up the database from scratch.
-- Safe to re-run: drops everything before recreating.
-- ============================================================

-- ============================================================
-- 1. DROP EXISTING (reverse dependency order)
-- ============================================================

DROP POLICY IF EXISTS "Org admins can view email logs" ON certificate_emails;
DROP POLICY IF EXISTS "Org admins can manage certificates" ON certificates;
DROP POLICY IF EXISTS "Users can read org certificates" ON certificates;
DROP POLICY IF EXISTS "Org admins can manage templates" ON certificate_templates;
DROP POLICY IF EXISTS "Users can read org templates" ON certificate_templates;
DROP POLICY IF EXISTS "Owners can remove members" ON user_memberships;
DROP POLICY IF EXISTS "Owners can add members" ON user_memberships;
DROP POLICY IF EXISTS "Users can read own memberships" ON user_memberships;
DROP POLICY IF EXISTS "Owners can delete orgs" ON organizations;
DROP POLICY IF EXISTS "Owners can update orgs" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON organizations;
DROP POLICY IF EXISTS "Users can read own orgs" ON organizations;

DROP TABLE IF EXISTS certificate_emails CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS certificate_templates CASCADE;
DROP TABLE IF EXISTS user_memberships CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================================
-- 2. TABLES
-- ============================================================

CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

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

CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  certificate_number TEXT UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  file_path TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_org_id ON user_memberships(organization_id);
CREATE INDEX idx_cert_templates_org ON certificate_templates(organization_id);
CREATE INDEX idx_certificates_org ON certificates(organization_id);
CREATE INDEX idx_certificates_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_email ON certificates(recipient_email);
CREATE INDEX idx_certificate_emails_cert ON certificate_emails(certificate_id);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orgs" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create orgs" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update orgs" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Owners can delete orgs" ON organizations
  FOR DELETE USING (
    id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role = 'OWNER'
    )
  );

-- User memberships
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memberships" ON user_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can add members" ON user_memberships
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Owners can remove members" ON user_memberships
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Certificate templates
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

-- Certificates
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

-- Certificate emails
ALTER TABLE certificate_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view email logs" ON certificate_emails
  FOR SELECT USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id IN (
        SELECT organization_id FROM user_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 5. SEED DATA
--    App tables only. Users created via the Seed Test Data button.
-- ============================================================

-- 5a. Organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES ('d4444444-4444-4444-4444-444444444444', 'Lyceum Of Alabang', 'lyceum-of-alabang', now(), now());
