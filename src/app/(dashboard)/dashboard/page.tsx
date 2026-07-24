import { getCurrentUser } from "@/features/auth/server/auth.actions";
import StatsCards from "@/features/dashboard/components/stats-cards";
import ActivityFeed from "@/features/dashboard/components/activity-feed";
import DashboardSearch from "@/features/dashboard/components/dashboard-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getRecentActivity } from "@/features/dashboard/server/dashboard.service";
import { ORG_ID } from "@/lib/org";

export default async function DashboardPage() {
  const [user, stats, activities] = await Promise.all([
    getCurrentUser(),
    getDashboardStats(ORG_ID),
    getRecentActivity(ORG_ID),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.user_metadata?.name ?? user?.email}
        </p>
      </div>

      <DashboardSearch />

      <StatsCards initialStats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed initialActivities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}
