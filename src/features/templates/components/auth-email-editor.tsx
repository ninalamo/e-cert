"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AUTH_PROCESS_LABELS } from "./email-placeholder-field";
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

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {lockProcess && authProcess && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Auth Process</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                {AUTH_PROCESS_LABELS[authProcess]}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              This template is configured for this specific auth process and cannot be changed.
            </p>
          </div>
        )}

        {!lockProcess && !authProcess && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Auth Process</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(AUTH_PROCESS_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleProcessChange(value as AuthProcess)}
                  disabled={disabled}
                  className={`rounded-xl px-4 py-3 text-center text-sm font-medium transition-all ${
                    authProcess === value
                      ? "bg-brand-600 text-white"
                      : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {authProcess && (
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={AUTH_PROCESS_LABELS[authProcess]}
                disabled={disabled}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Email Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter email title..."
                disabled={disabled}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter email message..."
                disabled={disabled}
                rows={4}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Button Text</label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Enter button text..."
                disabled={disabled}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {authProcess && (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const url = authProcess === 'registration' ? 'https://example.com/confirm' : authProcess === 'forgot_password' ? 'https://example.com/reset' : 'https://example.com/login';
                const html = buildAuthEmailHtml(title, message, buttonText, url, "Lyceum Of Alabang");
                onPreview?.(html, name || AUTH_PROCESS_LABELS[authProcess]);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Preview Email
            </button>

            <button
              type="submit"
              disabled={loading || disabled}
              className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <p className="text-sm font-medium text-gray-900">Saving changes...</p>
          </div>
        </div>
      )}
    </form>
  );
}
