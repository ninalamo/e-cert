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

const DEFAULT_AUTH_TITLES: Record<AuthProcess, string> = {
  registration: "Confirm Your Email",
  forgot_password: "Reset Your Password",
  confirm_email: "Email Confirmed!",
  password_reset: "Password Reset Successful",
  welcome: "Welcome to {{org_name}}!",
};

const DEFAULT_AUTH_MESSAGES: Record<AuthProcess, string> = {
  registration: "Thanks for signing up! Please confirm your email address to get started.",
  forgot_password: "We received a request to reset your password. Click the button below to choose a new password.",
  confirm_email: "Your email has been confirmed successfully. You can now log in to access your certificates and profile.",
  password_reset: "Your password has been updated successfully. You can now log in with your new password.",
  welcome: "Your account has been created successfully. You can now log in to access your certificates and profile.",
};

const DEFAULT_AUTH_BUTTONS: Record<AuthProcess, string> = {
  registration: "Confirm Email",
  forgot_password: "Reset Password",
  confirm_email: "Go to Login",
  password_reset: "Go to Login",
  welcome: "Go to Login",
};

function buildDefaultHtml(process: AuthProcess): string {
  const urlPlaceholder = process === 'registration' ? '{{confirm_url}}' : process === 'forgot_password' ? '{{reset_url}}' : '{{login_url}}';
  const title = DEFAULT_AUTH_TITLES[process];
  const message = DEFAULT_AUTH_MESSAGES[process];
  const buttonText = DEFAULT_AUTH_BUTTONS[process];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#4f39f6;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">{{org_name}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h2>
              <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;">
                ${message}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${urlPlaceholder}" style="display:inline-block;background-color:#4f39f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:13px;color:#4f39f6;word-break:break-all;">
                <a href="${urlPlaceholder}" style="color:#4f39f6;">${urlPlaceholder}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This is a security notification from {{org_name}}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
      // Create template with default HTML content
      const result = await createAuthTemplateAction({
        organization_id: ORG_ID,
        name: AUTH_PROCESS_LABELS[process],
        description: `Custom email template for ${AUTH_PROCESS_LABELS[process]}`,
        html_content: buildDefaultHtml(process),
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
