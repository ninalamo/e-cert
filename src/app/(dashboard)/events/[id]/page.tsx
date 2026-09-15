"use client";

import EventDetail from "./event-detail";
import { getCurrentGroups } from "@/lib/permissions";
import { hasDashboardAccess } from "@/lib/roles";
import { NotFoundState } from "@/components/not-found-state";
import { useSearchParams, useParams } from "next/navigation";

export default function EventDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tab = searchParams.get("tab");

  const tokenGroups = getCurrentGroups();
  const canUserDelete = tokenGroups.includes("cert-admin");

  if (!hasDashboardAccess(tokenGroups)) {
    return (
      <NotFoundState
        title="Insufficient access"
        description="Your account does not have permission to view events."
        backHref="/my"
        backLabel="Back to My Certificates"
      />
    );
  }

  return (
    <EventDetail
      eventId={id}
      canDelete={canUserDelete}
      initialTab={tab === "attendees" ? "attendees" : "details"}
    />
  );
}
