import EventDetail from "./event-detail";
import { getCurrentSession, canDelete } from "@/lib/permissions";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCurrentSession();
  const canUserDelete = canDelete(session?.role ?? "participant");
  return <EventDetail eventId={id} canDelete={canUserDelete} />;
}
