import Link from "next/link";
import TemplatesTable from "@/features/templates/components/templates-table";
import { getCertificateTemplatesWithLockStateAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";
import { PlusIcon } from "lucide-react";

export default async function CertificateTemplatesPage() {
  const templates = await getCertificateTemplatesWithLockStateAction(ORG_ID);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Certificate Templates
          </h1>
          <p className="mt-1 text-sm text-tertiary">
            Manage your certificate templates
          </p>
        </div>
        <Link href="/templates/certificates/new" className="btn-brand-soft">
          <PlusIcon className="size-4" />
          New Certificate
        </Link>
      </div>
      <TemplatesTable initialTemplates={templates} />
    </div>
  );
}
