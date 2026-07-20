import { Suspense } from "react";
import EventDetail from "./event-detail";
import { getCurrentSession, canDelete } from "@/lib/permissions";
import { getEventWithStats } from "@/features/events/server/event.service";
import { getTemplates } from "@/features/templates/server/template.service";
import { SkeletonEventDetail } from "@/components/ui/skeleton";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const session = await getCurrentSession();
  const canUserDelete = canDelete(session?.role ?? "participant");

  const initialData = await getEventWithStats(id);
  const initialTemplates = initialData?.event.organization_id
    ? await getTemplates(initialData.event.organization_id)
    : [];

  return (
    <Suspense fallback={<SkeletonEventDetail activeTab={tab === "attendees" ? "attendees" : "details"} />}>
      <EventDetail
        eventId={id}
        canDelete={canUserDelete}
        initialTab={tab === "attendees" ? "attendees" : "details"}
        initialData={initialData}
        initialTemplates={initialTemplates}
      />
    </Suspense>
  );
}
