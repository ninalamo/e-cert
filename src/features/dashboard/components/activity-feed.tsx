"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getRecentActivityAction } from "../server/dashboard.actions";

interface Activity {
  type: "certificate_issued" | "email_sent";
  certificate_number: string;
  recipient_name: string;
  timestamp: string;
}

function ActivityFeedInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    async function load() {
      const data = await getRecentActivityAction(orgId!);
      if (!cancelled) {
        setActivities(data);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orgId]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading activity...</p>;
  }

  if (!orgId) {
    return null;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, i) => (
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

export default function ActivityFeed() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <ActivityFeedInner />
    </Suspense>
  );
}
