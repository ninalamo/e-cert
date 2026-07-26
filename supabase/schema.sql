-- ============================================================
-- E-Cert — Idempotent Schema
-- Safe to run on an existing database at any time.
-- No data is dropped. All statements use IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('admin', 'staff', 'participant')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'certificate' CHECK (type IN ('certificate', 'email')),
  html_content TEXT NOT NULL DEFAULT '',
  css_content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id),
  email_template_id UUID REFERENCES certificate_templates(id),
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

CREATE TABLE IF NOT EXISTS certificates (
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

CREATE TABLE IF NOT EXISTS event_attendees (
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

CREATE TABLE IF NOT EXISTS certificate_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  sent_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS certificate_sequences (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (organization_id, pattern)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_org_id ON user_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_cert_templates_org ON certificate_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_cert_templates_org_created ON certificate_templates(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_templates_type ON certificate_templates(type);
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_org_created ON events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_email_template ON events(email_template_id);
CREATE INDEX IF NOT EXISTS idx_events_template ON events(template_id);
CREATE INDEX IF NOT EXISTS idx_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_org ON event_attendees(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendees_completed ON event_attendees(event_id, completed);
CREATE INDEX IF NOT EXISTS idx_attendees_certificate ON event_attendees(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificates_org ON certificates(organization_id);
CREATE INDEX IF NOT EXISTS idx_certificates_org_created ON certificates(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_event ON certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_email ON certificates(recipient_email);
CREATE INDEX IF NOT EXISTS idx_certificate_emails_cert ON certificate_emails(certificate_id);
CREATE INDEX IF NOT EXISTS idx_cert_sequences_org ON certificate_sequences(organization_id);

-- Deduplicate before creating the unique index
DELETE FROM certificates
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY event_id, recipient_email
        ORDER BY created_at ASC
      ) AS rn
    FROM certificates
    WHERE event_id IS NOT NULL
  ) dup
  WHERE dup.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS certificates_event_email_unique
  ON certificates (event_id, recipient_email)
  WHERE event_id IS NOT NULL;

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_organizations_updated_at') THEN
    CREATE TRIGGER trg_organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_memberships_updated_at') THEN
    CREATE TRIGGER trg_user_memberships_updated_at
      BEFORE UPDATE ON user_memberships
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cert_templates_updated_at') THEN
    CREATE TRIGGER trg_cert_templates_updated_at
      BEFORE UPDATE ON certificate_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_events_updated_at') THEN
    CREATE TRIGGER trg_events_updated_at
      BEFORE UPDATE ON events
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_certificates_updated_at') THEN
    CREATE TRIGGER trg_certificates_updated_at
      BEFORE UPDATE ON certificates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_event_attendees_updated_at') THEN
    CREATE TRIGGER trg_event_attendees_updated_at
      BEFORE UPDATE ON event_attendees
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_emails ENABLE ROW LEVEL SECURITY;

-- Helper: safe CREATE POLICY (skip if exists)
DO $$
BEGIN
  -- Organizations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can read org' AND tablename = 'organizations') THEN
    CREATE POLICY "Members can read org" ON organizations
      FOR SELECT USING (
        id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
      );
  END IF;

  -- User memberships
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read memberships' AND tablename = 'user_memberships') THEN
    CREATE POLICY "Users can read memberships" ON user_memberships
      FOR SELECT USING (
        user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can add members' AND tablename = 'user_memberships') THEN
    CREATE POLICY "Admins can add members" ON user_memberships
      FOR INSERT WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can remove members' AND tablename = 'user_memberships') THEN
    CREATE POLICY "Admins can remove members" ON user_memberships
      FOR DELETE USING (
        organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = auth.uid() AND role = 'admin'
        )
        AND user_id <> auth.uid()
      );
  END IF;

  -- Certificate templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can read templates' AND tablename = 'certificate_templates') THEN
    CREATE POLICY "Members can read templates" ON certificate_templates
      FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff and admins manage templates' AND tablename = 'certificate_templates') THEN
    CREATE POLICY "Staff and admins manage templates" ON certificate_templates
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can read events' AND tablename = 'events') THEN
    CREATE POLICY "Members can read events" ON events
      FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff and admins manage events' AND tablename = 'events') THEN
    CREATE POLICY "Staff and admins manage events" ON events
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Event attendees
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can read attendees' AND tablename = 'event_attendees') THEN
    CREATE POLICY "Members can read attendees" ON event_attendees
      FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff and admins manage attendees' AND tablename = 'event_attendees') THEN
    CREATE POLICY "Staff and admins manage attendees" ON event_attendees
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Certificates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can read org certificates' AND tablename = 'certificates') THEN
    CREATE POLICY "Members can read org certificates" ON certificates
      FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
        OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff and admins manage certificates' AND tablename = 'certificates') THEN
    CREATE POLICY "Staff and admins manage certificates" ON certificates
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Certificate sequences
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff and admins manage certificate sequences' AND tablename = 'certificate_sequences') THEN
    CREATE POLICY "Staff and admins manage certificate sequences" ON certificate_sequences
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Certificate emails (audit trail)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view email logs' AND tablename = 'certificate_emails') THEN
    CREATE POLICY "Admins can view email logs" ON certificate_emails
      FOR SELECT USING (
        certificate_id IN (
          SELECT id FROM certificates WHERE organization_id IN (
            SELECT organization_id FROM user_memberships
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
      );
  END IF;
END $$;

-- ============================================================
-- 6. GRANTS
-- ============================================================

GRANT SELECT ON auth.users TO authenticated;

-- ============================================================
-- 7. SEED DATA (idempotent)
-- ============================================================

INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES ('d4444444-4444-4444-4444-444444444444', 'Lyceum Of Alabang', 'lyceum-of-alabang', now(), now())
ON CONFLICT (id) DO NOTHING;
