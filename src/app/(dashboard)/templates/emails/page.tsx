import Link from "next/link";
import TemplatesTable from "@/features/templates/components/templates-table";
import { getEmailTemplatesWithLockStateAction, getAuthTemplatesAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";
import { PlusIcon } from "lucide-react";

export default async function EmailTemplatesPage() {
  const [emailTemplates, authTemplates] = await Promise.all([
    getEmailTemplatesWithLockStateAction(ORG_ID),
    getAuthTemplatesAction(ORG_ID),
  ]);
  const templates = [
    ...emailTemplates,
    ...authTemplates.map(t => ({ ...t, locked: false })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Email Templates
          </h1>
          <p className="mt-1 text-sm text-tertiary">
            Manage your email templates for certificate notifications and authentication emails
          </p>
        </div>
        <Link href="/templates/emails/new" className="btn-brand">
          <PlusIcon className="size-4" />
          New Email
        </Link>
      </div>
      <TemplatesTable initialTemplates={templates} />
    </div>
  );
}
