import TemplatesTable from "@/features/templates/components/templates-table";
import { getTemplatesWithLockState } from "@/features/templates/server/template.service";
import { ORG_ID } from "@/lib/org";

export default async function TemplatesPage() {
  const templates = await getTemplatesWithLockState(ORG_ID);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Templates
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Manage your certificate templates
        </p>
      </div>
      <TemplatesTable initialTemplates={templates} />
    </div>
  );
}
