import { api } from "./client";
import type { ApiResponse } from "./types";

export interface DashboardStats {
  total_events: number;
  active_events: number;
  total_certificates: number;
  certificates_issued_this_month: number;
  total_attendees: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user_email: string | null;
}

export const dashboardApi = {
  getStats: (organizationId: string) =>
    api.get<ApiResponse<DashboardStats>>(
      `/dashboard/stats?organization_id=${organizationId}`
    ),

  getRecentActivity: (organizationId: string) =>
    api.get<{ data: ActivityItem[] }>(
      `/dashboard/activity?organization_id=${organizationId}`
    ),
};
