import { getTemplates } from "@/features/templates/server/template.service";
import { ORG_ID } from "@/lib/org";
import NewEventForm from "./new-event-form";

export default async function NewEventPage() {
  const templates = await getTemplates(ORG_ID);
  return <NewEventForm templates={templates} />;
}
