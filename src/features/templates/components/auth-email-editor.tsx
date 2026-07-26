"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AUTH_PROCESS_LABELS, AUTH_PROCESS_PLACEHOLDERS } from "./email-placeholder-field";
import type { AuthProcess } from "@/types/template";

interface AuthEmailEditorProps {
  initialData?: {
    name: string;
    description: string;
    html_content: string;
    auth_process: AuthProcess | null;
  };
  onSubmit: (data: {
    name: string;
    description: string;
    html_content: string;
    auth_process: AuthProcess | null;
  }) => Promise<{ error?: string }>;
  disabled?: boolean;
  lockProcess?: boolean;
  onPreview?: (html: string, name: string) => void;
}

const DEFAULT_AUTH_TEMPLATES: Record<AuthProcess, { subject: string; title: string; message: string; buttonText: string }> = {
  registration: {
    subject: "Confirm Your Email",
    title: "Confirm Your Email",
    message: "Thanks for signing up! Please confirm your email address to get started.",
    buttonText: "Confirm Email",
  },
  forgot_password: {
    subject: "Reset Your Password",
    title: "Reset Your Password",
    message: "We received a request to reset your password. Click the button below to choose a new password.",
    buttonText: "Reset Password",
  },
  confirm_email: {
    subject: "Email Confirmed",
    title: "Email Confirmed!",
    message: "Your email has been confirmed successfully. You can now log in to access your certificates and profile.",
    buttonText: "Go to Login",
  },
  password_reset: {
    subject: "Password Reset Successful",
    title: "Password Reset Successful",
    message: "Your password has been updated successfully. You can now log in with your new password.",
    buttonText: "Go to Login",
  },
  welcome: {
    subject: "Welcome!",
    title: "Welcome to {{org_name}}!",
    message: "Your account has been created successfully. You can now log in to access your certificates and profile.",
    buttonText: "Go to Login",
  },
};

function buildAuthEmailHtml(
  title: string,
  message: string,
  buttonText: string,
  buttonUrl: string,
  orgName: string
): string {
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
              <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${orgName}</h1>
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
                    <a href="${buttonUrl}" style="display:inline-block;background-color:#4f39f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:13px;color:#4f39f6;word-break:break-all;">
                <a href="${buttonUrl}" style="color:#4f39f6;">${buttonUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This is a security notification from ${orgName}.
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

function parseAuthTemplate(html: string): { title: string; message: string; buttonText: string } {
  const titleMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/);
  const messageMatch = html.match(/<p[^>]*style="[^"]*font-size:15px[^"]*">(.*?)<\/p>/);
  const buttonMatch = html.match(/<a[^>]*style="[^"]*background-color:#4f39f6[^"]*"[^>]*>(.*?)<\/a>/);
  
  return {
    title: titleMatch?.[1] ?? "",
    message: messageMatch?.[1]?.replace(/<[^>]*>/g, '').trim() ?? "",
    buttonText: buttonMatch?.[1]?.trim() ?? "Click Here",
  };
}

export default function AuthEmailEditor({
  initialData,
  onSubmit,
  disabled = false,
  lockProcess = false,
  onPreview,
}: AuthEmailEditorProps) {
  const description = initialData?.description ?? "";

  const [name, setName] = useState(initialData?.name ?? "");
  const [authProcess, setAuthProcess] = useState<AuthProcess | null>(initialData?.auth_process ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsed = initialData?.html_content ? parseAuthTemplate(initialData.html_content) : null;
  const defaults = authProcess ? DEFAULT_AUTH_TEMPLATES[authProcess] : null;

  const [title, setTitle] = useState(parsed?.title ?? defaults?.title ?? "");
  const [message, setMessage] = useState(parsed?.message ?? defaults?.message ?? "");
  const [buttonText, setButtonText] = useState(parsed?.buttonText ?? defaults?.buttonText ?? "Click Here");

  function handleProcessChange(process: AuthProcess) {
    setAuthProcess(process);
    const d = DEFAULT_AUTH_TEMPLATES[process];
    setTitle(d.title);
    setMessage(d.message);
    setButtonText(d.buttonText);
    if (!name) setName(AUTH_PROCESS_LABELS[process]);
  }

  async function handleSave() {
    if (!authProcess) {
      setError("Please select an auth process");
      return;
    }
    setError(null);
    setLoading(true);

    const html = buildAuthEmailHtml(title, message, buttonText, `{{${authProcess === 'registration' ? 'confirm_url' : authProcess === 'forgot_password' ? 'reset_url' : 'login_url'}}}`, "Lyceum Of Alabang");
    
    const result = await onSubmit({
      name: name || AUTH_PROCESS_LABELS[authProcess],
      description,
      html_content: html,
      auth_process: authProcess,
    });
    
    if (result?.error) {
      setError(result.error);
    } else {
      toast.success("Template saved successfully");
    }
    setLoading(false);
  }

  const placeholderFields = authProcess ? AUTH_PROCESS_PLACEHOLDERS[authProcess] : [];

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {error}
        </div>
      )}

      <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
        {/* Auth Process - Locked */}
        {lockProcess && authProcess && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text)]">Auth Process</label>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                {AUTH_PROCESS_LABELS[authProcess]}
              </span>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                This template is configured for this specific auth process and cannot be changed.
              </p>
            </div>
          </div>
        )}

        {/* Auth Process Selector - Unlocked (only for new templates without pre-selected process) */}
        {!lockProcess && !authProcess && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text)]">Auth Process</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(AUTH_PROCESS_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleProcessChange(value as AuthProcess)}
                  disabled={disabled}
                  className={`rounded-xl border p-3 text-left text-sm transition-all ${
                    authProcess === value
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] ring-1 ring-[var(--color-brand-500)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-brand-300)]"
                  }`}
                >
                  <span className="font-medium text-[var(--color-text)]">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Template Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-text)]">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={authProcess ? AUTH_PROCESS_LABELS[authProcess] : "Select an auth process first"}
            disabled={disabled || !authProcess}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm transition-colors focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-text)]">Email Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter email title..."
            disabled={disabled || !authProcess}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm transition-colors focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-text)]">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter email message..."
            disabled={disabled || !authProcess}
            rows={4}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm transition-colors focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        {/* Button Text */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-text)]">Button Text</label>
          <input
            type="text"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="Enter button text..."
            disabled={disabled || !authProcess}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm transition-colors focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        {/* Available Placeholders Info */}
        {authProcess && placeholderFields.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Available Placeholders</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              These are automatically replaced with actual values when the email is sent.
            </p>
            <div className="flex flex-wrap gap-2">
              {placeholderFields.map((p) => (
                <code
                  key={p.key}
                  className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700"
                >
                  {`{{${p.key}}}`}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Preview Button */}
        {authProcess && (
          <button
            type="button"
            onClick={() => {
              const url = authProcess === 'registration' ? 'https://example.com/confirm' : authProcess === 'forgot_password' ? 'https://example.com/reset' : 'https://example.com/login';
              const html = buildAuthEmailHtml(title, message, buttonText, url, "Lyceum Of Alabang");
              onPreview?.(html, name || AUTH_PROCESS_LABELS[authProcess]);
            }}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            Preview Email
          </button>
        )}
      </fieldset>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-[var(--color-brand-600)] border-t-transparent" />
            <p className="text-sm font-medium text-[var(--color-text)]">Saving changes...</p>
          </div>
        </div>
      )}
    </form>
  );
}
