import type { ActivityItem } from "@/lib/api/dashboard";

interface ActivityFeedProps {
  initialActivities: ActivityItem[];
}

export default function ActivityFeed({ initialActivities }: ActivityFeedProps) {
  if (initialActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialActivities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div
            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
              activity.entity_type === "certificate"
                ? "bg-green-500"
                : "bg-blue-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{activity.action}</span>
              {" on "}
              <span className="font-mono text-xs">{activity.entity_type}</span>
              {activity.user_email && (
                <> by <span className="font-medium">{activity.user_email}</span></>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(activity.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
