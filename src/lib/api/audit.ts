import { api } from "./client";
import type { AuditLog } from "@/types/audit-log";

export interface AuditFilters {
  action?: string;
  user_id?: string;
  entity_type?: string;
  source?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  list: (filters?: AuditFilters) => {
    const qs = new URLSearchParams();
    if (filters?.action) qs.set("action", filters.action);
    if (filters?.user_id) qs.set("user_id", filters.user_id);
    if (filters?.entity_type) qs.set("entity_type", filters.entity_type);
    if (filters?.source) qs.set("source", filters.source);
    if (filters?.from_date) qs.set("from_date", filters.from_date);
    if (filters?.to_date) qs.set("to_date", filters.to_date);
    if (filters?.limit) qs.set("limit", String(filters.limit));
    if (filters?.offset) qs.set("offset", String(filters.offset));
    const q = qs.toString();
    return api.get<{ data: AuditLog[]; total: number }>(
      `/admin/audit-logs${q ? `?${q}` : ""}`
    );
  },

  getEntityLogs: (entityType: string, entityId: string) =>
    api.get<{ data: AuditLog[] }>(
      `/admin/audit-logs?entity_type=${entityType}&entity_id=${entityId}`
    ),

  getUserLogs: (userId: string) =>
    api.get<{ data: AuditLog[] }>(
      `/admin/audit-logs?user_id=${userId}`
    ),

  getForExport: (filters?: Omit<AuditFilters, "limit" | "offset">) => {
    const qs = new URLSearchParams();
    if (filters?.action) qs.set("action", filters.action);
    if (filters?.user_id) qs.set("user_id", filters.user_id);
    if (filters?.entity_type) qs.set("entity_type", filters.entity_type);
    if (filters?.source) qs.set("source", filters.source);
    if (filters?.from_date) qs.set("from_date", filters.from_date);
    if (filters?.to_date) qs.set("to_date", filters.to_date);
    qs.set("export", "true");
    const q = qs.toString();
    return api.get<{ data: AuditLog[] }>(`/admin/audit-logs?${q}`);
  },

  getByIds: (ids: string[]) =>
    api.post<{ data: AuditLog[] }>("/admin/audit-logs/by-ids", { ids }),

  deleteByIds: (ids: string[]) =>
    api.post<{ data: AuditLog[]; deletedCount: number }>(
      "/admin/audit-logs/delete",
      { ids }
    ),

  deleteAll: (filters?: Omit<AuditFilters, "limit" | "offset">) => {
    const qs = new URLSearchParams();
    if (filters?.action) qs.set("action", filters.action);
    if (filters?.user_id) qs.set("user_id", filters.user_id);
    if (filters?.entity_type) qs.set("entity_type", filters.entity_type);
    if (filters?.source) qs.set("source", filters.source);
    if (filters?.from_date) qs.set("from_date", filters.from_date);
    if (filters?.to_date) qs.set("to_date", filters.to_date);
    qs.set("delete_all", "true");
    const q = qs.toString();
    return api.post<{ data: AuditLog[]; deletedCount: number }>(
      `/admin/audit-logs?${q}`,
      {}
    );
  },
};
