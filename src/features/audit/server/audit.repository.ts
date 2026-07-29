import { BaseRepository } from "@/lib/repository/base.repository";
import type { AuditLog } from "@/types/audit-log";
import type { SupabaseClient } from "@supabase/supabase-js";

export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(client: SupabaseClient) {
    super("audit_logs", client);
  }

  async findByOrganizationId(
    organizationId: string,
    filters?: {
      action?: string;
      userId?: string;
      entityType?: string;
      source?: string;
      fromDate?: string;
      toDate?: string;
    },
    options?: { orderBy?: string; ascending?: boolean; limit?: number; offset?: number }
  ): Promise<{ data: AuditLog[]; total: number }> {
    let query = this.client
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId);

    if (filters?.action) query = query.eq("action", filters.action);
    if (filters?.userId) query = query.eq("user_id", filters.userId);
    if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
    if (filters?.source) query = query.eq("source", filters.source);
    if (filters?.fromDate) query = query.gte("created_at", filters.fromDate);
    if (filters?.toDate) query = query.lte("created_at", filters.toDate);

    query = query.order(options?.orderBy ?? "created_at", { ascending: options?.ascending ?? false });

    if (options?.limit) {
      query = query.range(options.offset ?? 0, (options.offset ?? 0) + options.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("[AuditLogRepository] findByOrganizationId error:", error.message);
      return { data: [], total: 0 };
    }
    return { data: (data ?? []) as AuditLog[], total: count ?? 0 };
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[AuditLogRepository] findByEntity error:", error.message);
      return [];
    }
    return (data ?? []) as AuditLog[];
  }

  async findByUserId(userId: string, organizationId: string): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[AuditLogRepository] findByUserId error:", error.message);
      return [];
    }
    return (data ?? []) as AuditLog[];
  }

  async findByIds(ids: string[]): Promise<AuditLog[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .in("id", ids);

    if (error) {
      console.error("[AuditLogRepository] findByIds error:", error.message);
      return [];
    }
    return (data ?? []) as AuditLog[];
  }

  async deleteByIds(ids: string[]): Promise<AuditLog[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.client
      .from("audit_logs")
      .delete()
      .in("id", ids)
      .select();

    if (error) {
      console.error("[AuditLogRepository] deleteByIds error:", error.message);
      return [];
    }
    return (data ?? []) as AuditLog[];
  }

  async findByOrganizationIdAll(
    organizationId: string,
    filters?: {
      action?: string;
      userId?: string;
      entityType?: string;
      source?: string;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<AuditLog[]> {
    let query = this.client
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organizationId);

    if (filters?.action) query = query.eq("action", filters.action);
    if (filters?.userId) query = query.eq("user_id", filters.userId);
    if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
    if (filters?.source) query = query.eq("source", filters.source);
    if (filters?.fromDate) query = query.gte("created_at", filters.fromDate);
    if (filters?.toDate) query = query.lte("created_at", filters.toDate);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("[AuditLogRepository] findByOrganizationIdAll error:", error.message);
      return [];
    }
    return (data ?? []) as AuditLog[];
  }

  async deleteByOrganizationId(
    organizationId: string,
    filters?: {
      action?: string;
      userId?: string;
      entityType?: string;
      source?: string;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<AuditLog[]> {
    const all = await this.findByOrganizationIdAll(organizationId, filters);
    if (all.length === 0) return [];
    return this.deleteByIds(all.map((l) => l.id));
  }
}
