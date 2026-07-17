import { getCurrentUser } from "@/features/auth/server/auth.actions";
import StatsCards from "@/features/dashboard/components/stats-cards";
import ActivityFeed from "@/features/dashboard/components/activity-feed";
import DashboardSearch from "@/features/dashboard/components/dashboard-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.user_metadata?.name ?? user?.email}
        </p>
      </div>

      <DashboardSearch />

      <StatsCards />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  );
}
