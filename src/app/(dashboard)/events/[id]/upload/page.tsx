import dynamic from "next/dynamic";
import { getCurrentSession } from "@/lib/permissions";
import { getEvent } from "@/features/events/server/event.service";
import { getTemplates } from "@/features/templates/server/template.service";

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

  let initialTemplate = null;
  if (event?.template_id && event.organization_id) {
    const templates = await getTemplates(event.organization_id);
    initialTemplate = templates.find((t) => t.id === event.template_id) ?? null;
  }

  return (
    <UploadCsvForm
      eventId={id}
      isAdmin={isAdmin}
      initialEvent={event}
      initialTemplate={initialTemplate}
    />
  );
}
