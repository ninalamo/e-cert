-- ============================================================
-- E-Cert — Full Schema + Seed Data
-- Run this single file to set up the database from scratch.
-- Safe to re-run: drops everything before recreating.
-- ============================================================

-- ============================================================
-- 1. DROP EXISTING (reverse dependency order)
-- ============================================================

DROP TABLE IF EXISTS certificate_emails CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS certificate_templates CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS events CASCADE;
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
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  location TEXT,
  organizer TEXT,
  certificate_title TEXT DEFAULT 'Certificate of Participation',
  certificate_number_pattern TEXT NOT NULL DEFAULT 'EPOCH',
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
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

CREATE TABLE event_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  attended_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certificate_id UUID REFERENCES certificates(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, email)
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

CREATE TABLE certificate_sequences (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (organization_id, pattern)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_org_id ON user_memberships(organization_id);
CREATE INDEX idx_cert_templates_org ON certificate_templates(organization_id);
CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_attendees_org ON event_attendees(organization_id);
CREATE INDEX idx_attendees_completed ON event_attendees(event_id, completed);
CREATE INDEX idx_certificates_org ON certificates(organization_id);
CREATE INDEX idx_certificates_event ON certificates(event_id);
CREATE INDEX idx_certificates_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_email ON certificates(recipient_email);
CREATE INDEX idx_certificate_emails_cert ON certificate_emails(certificate_id);
CREATE INDEX idx_events_template ON events(template_id);
CREATE INDEX idx_attendees_certificate ON event_attendees(certificate_id);

-- ============================================================
-- 3b. updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_memberships_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cert_templates_updated_at
  BEFORE UPDATE ON certificate_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_event_attendees_updated_at
  BEFORE UPDATE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3c. CERTIFICATE NUMBER SEQUENCE
-- Shared per-(organization, pattern) counter so two events using the
-- same pattern draw from one counter -> no collisions.
-- ============================================================

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

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- Roles: admin (full, incl. audit + delete), staff (all except audit + delete),
--         participant (own profile + own certificates by email), guest (none).
-- ============================================================

-- Helper: role of the current user for the single org
-- (inline in each policy to avoid needing a SECURITY DEFINER function)

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read org" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

-- Org is single-tenant; no insert/update/delete by app users.

-- User memberships
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read memberships" ON user_memberships
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can add members" ON user_memberships
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can remove members" ON user_memberships
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    AND user_id <> auth.uid()
  );

-- Certificate templates
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read templates" ON certificate_templates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff and admins manage templates" ON certificate_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read events" ON events
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff and admins manage events" ON events
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Event attendees
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read attendees" ON event_attendees
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff and admins manage attendees" ON event_attendees
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read org certificates" ON certificates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Staff and admins manage certificates" ON certificates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Certificate sequences
ALTER TABLE certificate_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins manage certificate sequences" ON certificate_sequences
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Certificate emails (audit trail — admins only)
ALTER TABLE certificate_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs" ON certificate_emails
  FOR SELECT USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Email logs are written by the service role (bypasses RLS); no app-user writes.

-- ============================================================
-- 5. SEED DATA
-- ============================================================

-- 5a. Organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES ('d4444444-4444-4444-4444-444444444444', 'Lyceum Of Alabang', 'lyceum-of-alabang', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5b. Auth users + memberships are seeded via the Supabase Admin API,
--     NOT raw SQL. GoTrue (Supabase Auth) rejects password hashes
--     produced by pgcrypto — only the Admin API produces valid hashes.
--
--     Clean slate: remove all auth rows so GoTrue starts fresh.
--     Safe to re-run.
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

--     After running this schema, seed users by running:
--       npx tsx scripts/seed-users.ts
--     Or by calling PUT http://localhost:3000/api/health
--
--     Default credentials (all roles):
--       admin@lyceumalabang.edu.ph      / password123
--       staff@lyceumalabang.edu.ph      / password123
--       participant@lyceumalabang.edu.ph / password123
