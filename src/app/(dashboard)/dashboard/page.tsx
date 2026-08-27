"use client";

import { useState, useEffect } from "react";
import { parseAccessToken, getAccessToken } from "@/lib/auth";
import StatsCards from "@/features/dashboard/components/stats-cards";
import ActivityFeed from "@/features/dashboard/components/activity-feed";
import DashboardSearch from "@/features/dashboard/components/dashboard-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi, type DashboardStats, type ActivityItem } from "@/lib/api/dashboard";
import { ORG_ID } from "@/lib/org";

export default function DashboardPage() {
  const token = getAccessToken();
  const user = token ? parseAccessToken(token) : null;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsResult, activitiesResult] = await Promise.all([
          dashboardApi.getStats(ORG_ID),
          dashboardApi.getRecentActivity(ORG_ID),
        ]);
        setStats(statsResult.data);
        setActivities(activitiesResult.data ?? []);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name ?? user?.email}
        </p>
      </div>

      <DashboardSearch />

      <StatsCards initialStats={stats} isLoading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed initialActivities={activities} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
