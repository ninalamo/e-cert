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
};
