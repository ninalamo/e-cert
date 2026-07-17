"use server";

import * as dashboardService from "./dashboard.service";
import { requireRole } from "@/lib/permissions";

export async function getDashboardStatsAction(organizationId: string) {
  await requireRole(["admin", "staff"]);
  return dashboardService.getDashboardStats(organizationId);
}

export async function getRecentActivityAction(organizationId: string) {
  await requireRole(["admin", "staff"]);
  return dashboardService.getRecentActivity(organizationId);
}
