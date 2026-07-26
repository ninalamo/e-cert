"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAuthTemplatesAction,
  createAuthTemplateAction,
  deleteTemplateAction,
} from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";
import { AUTH_PROCESS_LABELS } from "@/features/templates/components/email-placeholder-field";
import type { AuthProcess } from "@/types/template";
import type { CertificateTemplate } from "@/types/template";

const DEFAULT_AUTH_SUBJECTS: Record<AuthProcess, string> = {
  registration: "Confirm Your Email",
  forgot_password: "Reset Your Password",
  confirm_email: "Email Confirmed",
  password_reset: "Password Reset Successful",
  welcome: "Welcome!",
};

export default function AuthEmailsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<AuthProcess | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const data = await getAuthTemplatesAction(ORG_ID);
    setTemplates(data);
    setLoading(false);
  }

  const templateMap = new Map(templates.map(t => [t.auth_process, t]));
  const allProcesses = Object.keys(AUTH_PROCESS_LABELS) as AuthProcess[];

  async function handleToggle(process: AuthProcess, enabled: boolean) {
    setToggling(process);

    if (enabled) {
      // Create template with defaults
      const result = await createAuthTemplateAction({
        organization_id: ORG_ID,
        name: AUTH_PROCESS_LABELS[process],
        description: `Custom email template for ${AUTH_PROCESS_LABELS[process]}`,
        html_content: "",
        css_content: "",
        auth_process: process,
      });

      if (result.template) {
        await loadTemplates();
        router.push(`/templates/auth-emails/${result.template.id}`);
      }
    } else {
      // Delete the custom template
      const existing = templateMap.get(process);
      if (existing) {
        await deleteTemplateAction(existing.id);
        await loadTemplates();
      }
    }

    setToggling(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Auth Email Templates
          </h1>
        </div>
        <div className="app-card p-12 text-center">
          <div className="size-6 animate-spin rounded-full border-2 border-[var(--color-brand-600)] border-t-transparent mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Auth Email Templates
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Toggle between default or custom email templates for each authentication process
        </p>
      </div>

      <div className="app-card divide-y divide-border overflow-hidden">
        {allProcesses.map((process) => {
          const template = templateMap.get(process);
          const isEnabled = !!template;
          const isToggling = toggling === process;

          return (
            <div
              key={process}
              className="flex items-center justify-between gap-4 px-4 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-text)]">
                  {AUTH_PROCESS_LABELS[process]}
                </p>
                <p className="mt-0.5 text-xs text-tertiary">
                  {isEnabled ? "Custom template active" : "Using default hardcoded template"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {isEnabled && (
                  <Link
                    href={`/templates/auth-emails/${template.id}`}
                    className="text-sm text-[var(--color-brand-600)] hover:underline"
                  >
                    Edit
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => handleToggle(process, !isEnabled)}
                  disabled={isToggling}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isEnabled ? "bg-[var(--color-brand-600)]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        Toggle ON to customize the email template. Toggle OFF to use the default system template.
      </p>
    </div>
  );
}
