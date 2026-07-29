"use server";

import { requireRole } from "@/lib/permissions";
import {
  getAuditLogs,
  getEntityAuditLog,
  getUserAuditLog,
  getAuditLogsForExport,
  getAuditLogsByIds,
  deleteAuditLogsByIds,
  deleteAllAuditLogs,
} from "./audit.service";
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

export async function getAuditLogsForExportAction(filters?: {
  action?: string;
  userId?: string;
  entityType?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AuditLog[]> {
  await requireRole(["admin"]);
  return getAuditLogsForExport(ORG_ID, filters);
}

export async function deleteAuditLogsAction(ids: string[]): Promise<{ data: AuditLog[]; deletedCount: number }> {
  await requireRole(["admin"]);
  const deleted = await deleteAuditLogsByIds(ids);
  return { data: deleted, deletedCount: deleted.length };
}

export async function deleteAllAuditLogsAction(filters?: {
  action?: string;
  userId?: string;
  entityType?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{ data: AuditLog[]; deletedCount: number }> {
  await requireRole(["admin"]);
  const deleted = await deleteAllAuditLogs(ORG_ID, filters);
  return { data: deleted, deletedCount: deleted.length };
}

export async function getAuditLogsByIdsAction(ids: string[]): Promise<AuditLog[]> {
  await requireRole(["admin"]);
  return getAuditLogsByIds(ids);
}
