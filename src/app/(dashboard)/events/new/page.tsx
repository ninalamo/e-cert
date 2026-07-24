import { getTemplates, getEmailTemplates } from "@/features/templates/server/template.service";
import { ORG_ID } from "@/lib/org";
import NewEventForm from "./new-event-form";

export default async function NewEventPage() {
  const [templates, emailTemplates] = await Promise.all([
    getTemplates(ORG_ID),
    getEmailTemplates(ORG_ID),
  ]);
  return <NewEventForm templates={templates} emailTemplates={emailTemplates} />;
}
