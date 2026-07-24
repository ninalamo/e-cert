import { Suspense } from "react";
import EventDetail from "./event-detail";
import { getCurrentSession, canDelete } from "@/lib/permissions";
import { getEventWithStats } from "@/features/events/server/event.service";
import { getTemplates, getEmailTemplates } from "@/features/templates/server/template.service";
import { SkeletonEventDetail } from "@/components/ui/skeleton";
import { ORG_ID } from "@/lib/org";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [session, initialData, initialTemplates, initialEmailTemplates] = await Promise.all([
    getCurrentSession(),
    getEventWithStats(id),
    getTemplates(ORG_ID),
    getEmailTemplates(ORG_ID),
  ]);

  const canUserDelete = canDelete(session?.role ?? "participant");

  return (
    <Suspense fallback={<SkeletonEventDetail activeTab={tab === "attendees" ? "attendees" : "details"} />}>
      <EventDetail
        eventId={id}
        canDelete={canUserDelete}
        initialTab={tab === "attendees" ? "attendees" : "details"}
        initialData={initialData}
        initialTemplates={initialTemplates}
        initialEmailTemplates={initialEmailTemplates}
      />
    </Suspense>
  );
}
