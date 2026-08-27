import { getAccessToken } from "@/lib/auth/token-store";

const BASE_URL = "/auth-api/v1";

const isLocalhost =
  typeof window !== "undefined" &&
  window.location.hostname === "localhost";

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

async function logApi(
  method: string,
  path: string,
  startedAt: number,
  res: Response
) {
  if (!isLocalhost) return;
  const ms = Math.round(performance.now() - startedAt);
  const label = `[API] ${method} ${BASE_URL}${path} → ${res.status} [${ms}ms]`;
  if (res.ok) {
    console.log(label);
    return;
  }
  const errBody = await res.clone().json().catch(() => undefined);
  console.error(label, errBody ?? "");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("API client can only be used in the browser");
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const method = options.method ?? "GET";
  const startedAt = performance.now();

  if (isLocalhost) {
    console.log(`[API] → ${method} ${BASE_URL}${path}`);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err) {
    if (isLocalhost) {
      console.error(`[API] ${method} ${BASE_URL}${path} → network error`, err);
    }
    throw err;
  }

  await logApi(method, path, startedAt, res);

  if (!res.ok) {
    const err = await res.json().catch(() => undefined);
    throw err ?? { status: "error", message: `Request failed (${res.status})` };
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
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
    request<{ data: ManagedUser[]; meta?: UsersListMeta }>(
      `/users${buildUsersQuery(params)}`
    ),

  listGroups: (tenantId?: string) =>
    request<{ data: ManagedGroup[] }>(
      `/groups${tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : ""}`
    ),

  setStatus: (id: string, status: "active" | "disabled") =>
    request<{ message: string }>(`/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
};
