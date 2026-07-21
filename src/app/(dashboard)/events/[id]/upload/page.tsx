import dynamic from "next/dynamic";
import { getCurrentSession } from "@/lib/permissions";
import { getEvent } from "@/features/events/server/event.service";

const UploadCsvForm = dynamic(() => import("./upload-csv-form"));

export default async function UploadCsvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCurrentSession();
  const isAdmin = session?.role === "admin";
  const event = await getEvent(id);
  return <UploadCsvForm eventId={id} isAdmin={isAdmin} initialEvent={event} />;
}
