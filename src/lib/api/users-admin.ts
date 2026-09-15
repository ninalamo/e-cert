import { api } from "./client";

export interface UserGroupRef {
  id: string;
  name: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  status: "active" | "disabled";
  created_at: string;
  groups?: UserGroupRef[];
}

export interface UsersListMeta {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

export interface ManagedGroup {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string | null;
  members_count: number;
  created_at: string | null;
}

export interface UsersListParams {
  search?: string;
  group_id?: string;
  limit?: number;
  offset?: number;
}

function buildUsersQuery(params: UsersListParams = {}): string {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.group_id) qs.set("group_id", params.group_id);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export const usersAdminApi = {
  list: (params: UsersListParams = {}) =>
    api.get<{ data: ManagedUser[]; meta?: UsersListMeta }>(
      `/service/users${buildUsersQuery(params)}`
    ),

  listGroups: (tenantId?: string) =>
    api.get<{ data: ManagedGroup[] }>(
      `/service/groups${tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : ""}`
    ),

  setStatus: (id: string, status: "active" | "disabled") =>
    api.patch<{ message: string }>(`/service/users/${id}/status`, { status }),

  listUserGroups: (id: string) =>
    api.get<{ user_id: string; groups: UserGroupRef[] }>(
      `/service/users/${encodeURIComponent(id)}/groups`
    ),

  addUserGroup: (id: string, group_id: string) =>
    api.post<{ status: string; user_id: string; group_id: string }>(
      `/service/users/${encodeURIComponent(id)}/groups`,
      { group_id }
    ),

  removeUserGroup: (id: string, groupId: string) =>
    api.delete(
      `/service/users/${encodeURIComponent(id)}/groups/${encodeURIComponent(groupId)}`
    ),

  changeUserRole: async (
    user: ManagedUser,
    targetRole: "cert-staff" | "cert-user" | "cert-admin",
    groups: ManagedGroup[]
  ): Promise<UserGroupRef[]> => {
    const groupByName = new Map(groups.map((g) => [g.name, g]));
    const target = groupByName.get(targetRole);
    if (!target) throw { message: `Group "${targetRole}" not found.` };

    const currentCertNames = (user.groups ?? [])
      .map((g) => g.name)
      .filter((n) => n.startsWith("cert-"));

    // cert-admin cannot be demoted here — revoke only in Auth admin.
    if (
      currentCertNames.includes("cert-admin") &&
      targetRole !== "cert-admin"
    ) {
      throw { message: "Admins can only be changed in Auth admin." };
    }

    const currentCertGroupIds = new Set(
      (user.groups ?? [])
        .filter((g) => g.name === "cert-staff" || g.name === "cert-user")
        .map((g) => g.id)
    );

    // Remove old cert-staff/cert-user memberships first, keep non-cert groups untouched.
    for (const groupId of currentCertGroupIds) {
      if (groupId === target.id) continue;
      await api.delete(
        `/service/users/${encodeURIComponent(user.id)}/groups/${encodeURIComponent(groupId)}`
      );
    }

    // Add target (409 = already a member → treat as success).
    try {
      await api.post(
        `/service/users/${encodeURIComponent(user.id)}/groups`,
        { group_id: target.id }
      );
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "";
      const alreadyMember =
        status === 409 || /already in this group/i.test(message);
      if (!alreadyMember) throw err;
    }

    return (user.groups ?? [])
      .filter((g) => g.name !== "cert-staff" && g.name !== "cert-user")
      .concat([{ id: target.id, name: target.name }]);
  },
};
