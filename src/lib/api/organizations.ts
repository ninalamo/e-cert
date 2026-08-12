import { api } from "./client";

export interface OrgMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
}

export const organizationsApi = {
  getMembers: (organizationId: string) =>
    api.get<{ data: OrgMember[] }>(`/admin/organizations/${organizationId}/members`),

  removeMember: (organizationId: string, memberId: string) =>
    api.delete(`/admin/organizations/${organizationId}/members/${memberId}`),
};
