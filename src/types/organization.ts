export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = "admin" | "staff" | "participant";

export interface UserMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface OrganizationWithMembers extends Organization {
  user_memberships: UserMembership[];
}
