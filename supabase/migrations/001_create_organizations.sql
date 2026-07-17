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

-- RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

-- Users can read orgs they belong to
CREATE POLICY "Users can read own orgs" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

-- Users can read memberships in their orgs
CREATE POLICY "Users can read own memberships" ON user_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM user_memberships WHERE user_id = auth.uid())
  );

-- Anyone authenticated can create an org (becomes OWNER)
CREATE POLICY "Authenticated users can create orgs" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Org owners/admins can update
CREATE POLICY "Owners can update orgs" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Org owners can delete
CREATE POLICY "Owners can delete orgs" ON organizations
  FOR DELETE USING (
    id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role = 'OWNER'
    )
  );

-- Org owners/admins can insert members
CREATE POLICY "Owners can add members" ON user_memberships
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Org owners/admins can remove members
CREATE POLICY "Owners can remove members" ON user_memberships
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_memberships
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Indexes
CREATE INDEX idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_org_id ON user_memberships(organization_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
