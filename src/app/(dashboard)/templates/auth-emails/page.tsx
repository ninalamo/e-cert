import Link from "next/link";
import { getAuthTemplatesAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";
import { AUTH_PROCESS_LABELS } from "@/features/templates/components/email-placeholder-field";
import type { AuthProcess } from "@/types/template";
import { PlusIcon } from "lucide-react";

export default async function AuthEmailsPage() {
  const templates = await getAuthTemplatesAction(ORG_ID);

  const assignedProcesses = new Set(templates.map(t => t.auth_process));
  const unassignedProcesses = (Object.keys(AUTH_PROCESS_LABELS) as AuthProcess[]).filter(
    p => !assignedProcesses.has(p)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Auth Email Templates
          </h1>
          <p className="mt-1 text-sm text-tertiary">
            Manage authentication email templates for registration, password reset, and email confirmation
          </p>
        </div>
        <Link href="/templates/auth-emails/new" className="btn-brand">
          <PlusIcon className="size-4" />
          New Auth Email
        </Link>
      </div>

      {/* Configured Templates */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Configured Templates</h2>
        {templates.length === 0 ? (
          <div className="app-card p-12 text-center">
            <p className="text-sm text-tertiary">
              No auth email templates configured. Create your first one to customize authentication emails.
            </p>
          </div>
        ) : (
          <div className="app-card divide-y divide-border overflow-hidden">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/templates/auth-emails/${t.id}`}
                      className="font-medium text-[var(--color-text)] hover:underline"
                    >
                      {t.name}
                    </Link>
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      {t.auth_process ? AUTH_PROCESS_LABELS[t.auth_process] : "Unknown"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-tertiary">
                    {t.description || "No description"}
                    {" · "}
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/templates/auth-emails/${t.id}`}
                  className="btn-disclosure"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unconfigured Processes */}
      {unassignedProcesses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Available to Configure</h2>
          <div className="app-card divide-y divide-border overflow-hidden">
            {unassignedProcesses.map((process) => (
              <div
                key={process}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-text)]">
                    {AUTH_PROCESS_LABELS[process]}
                  </p>
                  <p className="mt-0.5 text-xs text-tertiary">
                    Uses default hardcoded email template
                  </p>
                </div>
                <Link
                  href={`/templates/auth-emails/new?process=${process}`}
                  className="btn-disclosure"
                >
                  Configure
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
