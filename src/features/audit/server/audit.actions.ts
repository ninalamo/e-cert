"use server";

import { requireRole } from "@/lib/permissions";
import { getAuditLogs, getEntityAuditLog, getUserAuditLog } from "./audit.service";
import { ORG_ID } from "@/lib/org";
import type { AuditLog } from "@/types/audit-log";

export async function getAuditLogsAction(filters?: {
  action?: string;
  userId?: string;
  entityType?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AuditLog[]; total: number }> {
  await requireRole(["admin"]);
  return getAuditLogs(ORG_ID, filters, {
    orderBy: "created_at",
    ascending: false,
    limit: filters?.limit ?? 50,
    offset: filters?.offset ?? 0,
  });
}

export async function getEntityAuditLogsAction(entityType: string, entityId: string): Promise<AuditLog[]> {
  await requireRole(["admin"]);
  return getEntityAuditLog(entityType, entityId);
}

export async function getUserAuditLogsAction(userId: string): Promise<AuditLog[]> {
  await requireRole(["admin"]);
  return getUserAuditLog(userId, ORG_ID);
}
