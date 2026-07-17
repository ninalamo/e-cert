"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as dashboardService from "./dashboard.service";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getDashboardStatsAction(organizationId: string) {
  await requireAuth();
  return dashboardService.getDashboardStats(organizationId);
}

export async function getRecentActivityAction(organizationId: string) {
  await requireAuth();
  return dashboardService.getRecentActivity(organizationId);
}
