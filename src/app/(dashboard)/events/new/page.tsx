import { getCertificateTemplatesWithLockState, getEmailTemplatesWithLockState } from "@/features/templates/server/template.service";
import { ORG_ID } from "@/lib/org";
import NewEventForm from "./new-event-form";

export default async function NewEventPage() {
  const [templates, emailTemplates] = await Promise.all([
    getCertificateTemplatesWithLockState(ORG_ID),
    getEmailTemplatesWithLockState(ORG_ID),
  ]);
  return (
    <NewEventForm
      templates={templates.filter((t) => !t.locked)}
      emailTemplates={emailTemplates.filter((t) => !t.locked)}
    />
  );
}
