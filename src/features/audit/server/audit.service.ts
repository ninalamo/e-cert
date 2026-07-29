import { AuditLogRepository } from "./audit.repository";
import type { AuditLog, AuditAction, AuditSource } from "@/types/audit-log";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getDefaultClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

export async function logAudit(params: {
  organization_id: string;
  user_id?: string;
  user_email?: string;
  action: AuditAction;
  source: AuditSource;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  client?: SupabaseClient;
}): Promise<void> {
  try {
    const client = params.client ?? await getDefaultClient();
    const repo = new AuditLogRepository(client);
    await repo.create({
      organization_id: params.organization_id,
      user_id: params.user_id ?? null,
      user_email: params.user_email ?? null,
      action: params.action,
      source: params.source,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      details: params.details ?? null,
      ip_address: params.ip_address ?? null,
      user_agent: params.user_agent ?? null,
    } as Partial<AuditLog>);
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}

export async function getAuditLogs(
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
  const repo = new AuditLogRepository(await getDefaultClient());
  return repo.findByOrganizationId(organizationId, filters, options);
}

export async function getEntityAuditLog(entityType: string, entityId: string): Promise<AuditLog[]> {
  const repo = new AuditLogRepository(await getDefaultClient());
  return repo.findByEntity(entityType, entityId);
}

export async function getUserAuditLog(userId: string, organizationId: string): Promise<AuditLog[]> {
  const repo = new AuditLogRepository(await getDefaultClient());
  return repo.findByUserId(userId, organizationId);
}

export async function getAuditLogsForExport(
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
  const repo = new AuditLogRepository(await getDefaultClient());
  return repo.findByOrganizationIdAll(organizationId, filters);
}

export async function deleteAuditLogsByIds(ids: string[]): Promise<AuditLog[]> {
  const repo = new AuditLogRepository(await getDefaultClient());
  return repo.deleteByIds(ids);
}

export async function deleteAllAuditLogs(
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
  const repo = new AuditLogRepository(await getDefaultClient());
  return repo.deleteByOrganizationId(organizationId, filters);
}

export async function getAuditLogsByIds(ids: string[]): Promise<AuditLog[]> {
  const repo = new AuditLogRepository(await getDefaultClient());
  return repo.findByIds(ids);
}
