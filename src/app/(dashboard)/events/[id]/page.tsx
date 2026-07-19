import EventDetail from "./event-detail";
import { getCurrentSession, canDelete } from "@/lib/permissions";

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
  return <EventDetail eventId={id} canDelete={canUserDelete} initialTab={tab === "attendees" ? "attendees" : "details"} />;
}
