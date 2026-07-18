"use server";

import * as dashboardService from "./dashboard.service";
import { requireSession } from "@/lib/permissions";

export async function getDashboardStatsAction(organizationId: string) {
  await requireSession();
  return dashboardService.getDashboardStats(organizationId);
}

export async function getRecentActivityAction(organizationId: string) {
  await requireSession();
  return dashboardService.getRecentActivity(organizationId);
}
