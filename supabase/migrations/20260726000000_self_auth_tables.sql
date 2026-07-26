-- Migration: Self-hosted auth tables
-- Creates users, refresh_tokens, password_resets, email_confirmations
-- Replaces Supabase auth.users references

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  email_confirmed_at TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_user ON email_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_hash ON email_confirmations(token_hash);

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ============================================================
-- 4. HELPER FUNCTION — replaces auth.uid()
--    The proxy sets this via: SET LOCAL app.user_id = '<uuid>';
-- ============================================================

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::UUID;
$$;

-- ============================================================
-- 5. UPDATE FOREIGN KEYS
-- ============================================================

-- user_memberships: change FK from auth.users to users
ALTER TABLE user_memberships
  DROP CONSTRAINT IF EXISTS user_memberships_user_id_fkey;

ALTER TABLE user_memberships
  ADD CONSTRAINT user_memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- certificate_emails: change FK from auth.users to users
ALTER TABLE certificate_emails
  DROP CONSTRAINT IF EXISTS certificate_emails_sent_by_fkey;

ALTER TABLE certificate_emails
  ADD CONSTRAINT certificate_emails_sent_by_fkey
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 6. ROW LEVEL SECURITY — replace auth.uid() references
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Members can read org" ON organizations;
DROP POLICY IF EXISTS "Users can read memberships" ON user_memberships;
DROP POLICY IF EXISTS "Admins can add members" ON user_memberships;
DROP POLICY IF EXISTS "Admins can remove members" ON user_memberships;
DROP POLICY IF EXISTS "Members can read templates" ON certificate_templates;
DROP POLICY IF EXISTS "Staff and admins manage templates" ON certificate_templates;
DROP POLICY IF EXISTS "Members can read events" ON events;
DROP POLICY IF EXISTS "Staff and admins manage events" ON events;
DROP POLICY IF EXISTS "Members can read attendees" ON event_attendees;
DROP POLICY IF EXISTS "Staff and admins manage attendees" ON event_attendees;
DROP POLICY IF EXISTS "Members can read org certificates" ON certificates;
DROP POLICY IF EXISTS "Staff and admins manage certificates" ON certificates;
DROP POLICY IF EXISTS "Staff and admins manage certificate sequences" ON certificate_sequences;
DROP POLICY IF EXISTS "Admins can view email logs" ON certificate_emails;

-- Recreate policies using current_user_id()
DO $$
BEGIN
  -- Organizations
  CREATE POLICY "Members can read org" ON organizations
    FOR SELECT USING (
      id IN (SELECT organization_id FROM user_memberships WHERE user_id = current_user_id())
    );

  -- User memberships
  CREATE POLICY "Users can read memberships" ON user_memberships
    FOR SELECT USING (
      user_id = current_user_id()
    );

  CREATE POLICY "Admins can add members" ON user_memberships
    FOR INSERT WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = current_user_id() AND role = 'admin'
      )
    );

  CREATE POLICY "Admins can remove members" ON user_memberships
    FOR DELETE USING (
      organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = current_user_id() AND role = 'admin'
      )
      AND user_id <> current_user_id()
    );

  -- Certificate templates
  CREATE POLICY "Members can read templates" ON certificate_templates
    FOR SELECT USING (
      organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = current_user_id())
    );

  CREATE POLICY "Staff and admins manage templates" ON certificate_templates
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = current_user_id() AND role IN ('admin', 'staff')
      )
    );

  -- Events
  CREATE POLICY "Members can read events" ON events
    FOR SELECT USING (
      organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = current_user_id())
    );

  CREATE POLICY "Staff and admins manage events" ON events
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = current_user_id() AND role IN ('admin', 'staff')
      )
    );

  -- Event attendees
  CREATE POLICY "Members can read attendees" ON event_attendees
    FOR SELECT USING (
      organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = current_user_id())
    );

  CREATE POLICY "Staff and admins manage attendees" ON event_attendees
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = current_user_id() AND role IN ('admin', 'staff')
      )
    );

  -- Certificates
  CREATE POLICY "Members can read org certificates" ON certificates
    FOR SELECT USING (
      organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = current_user_id())
      OR recipient_email = (SELECT email FROM users WHERE id = current_user_id())
    );

  CREATE POLICY "Staff and admins manage certificates" ON certificates
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = current_user_id() AND role IN ('admin', 'staff')
      )
    );

  -- Certificate sequences
  CREATE POLICY "Staff and admins manage certificate sequences" ON certificate_sequences
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = current_user_id() AND role IN ('admin', 'staff')
      )
    );

  -- Certificate emails
  CREATE POLICY "Admins can view email logs" ON certificate_emails
    FOR SELECT USING (
      certificate_id IN (
        SELECT id FROM certificates WHERE organization_id IN (
          SELECT organization_id FROM user_memberships
          WHERE user_id = current_user_id() AND role = 'admin'
        )
      )
    );
END $$;

-- ============================================================
-- 7. CLEANUP OLD GRANTS
-- ============================================================

-- No longer need auth.users access
REVOKE SELECT ON auth.users FROM authenticated;
