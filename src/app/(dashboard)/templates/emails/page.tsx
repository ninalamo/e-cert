import Link from "next/link";
import { Suspense } from "react";
import TemplatesTable from "@/features/templates/components/templates-table";
import { getEmailTemplatesWithLockStateAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";
import { PlusIcon } from "lucide-react";
import { SkeletonTable } from "@/components/ui/skeleton";

async function EmailTemplatesContent() {
  const templates = await getEmailTemplatesWithLockStateAction(ORG_ID);
  return <TemplatesTable initialTemplates={templates} />;
}

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Email Templates
          </h1>
          <p className="mt-1 text-sm text-tertiary">
            Manage your email templates for certificate notifications
          </p>
        </div>
        <Link href="/templates/emails/new" className="btn-brand">
          <PlusIcon className="size-4" />
          New Email
        </Link>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <EmailTemplatesContent />
      </Suspense>
    </div>
  );
}