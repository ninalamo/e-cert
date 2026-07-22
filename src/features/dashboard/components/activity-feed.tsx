"use client";

import type { RecentActivity } from "../server/dashboard.service";

interface ActivityFeedProps {
  initialActivities: RecentActivity[];
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
      {initialActivities.map((activity, i) => (
        <div key={i} className="flex items-start gap-3">
          <div
            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
              activity.type === "certificate_issued"
                ? "bg-green-500"
                : "bg-blue-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              {activity.type === "certificate_issued" ? (
                <>
                  Certificate <span className="font-mono text-xs">{activity.certificate_number}</span> issued to{" "}
                  <span className="font-medium">{activity.recipient_name}</span>
                </>
              ) : (
                <>
                  Email sent to <span className="font-medium">{activity.recipient_name}</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
