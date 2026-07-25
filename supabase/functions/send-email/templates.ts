// Branded auth email templates for the Send Email Hook.
// Style matches src/features/templates/components/email-block-builder-v2/block-definitions.ts.

export type EmailActionType =
  | "signup"
  | "recovery"
  | "magiclink"
  | "email_change"
  | "invite"
  | "reauthentication"
  | "email"
  | "password_changed_notification"
  | "email_changed_notification"
  | "phone_changed_notification"
  | "identity_linked_notification"
  | "identity_unlinked_notification"
  | "mfa_factor_enrolled_notification"
  | "mfa_factor_unenrolled_notification";

type RenderInput = {
  action: EmailActionType;
  confirmationUrl: string;
  token: string;
  siteUrl: string;
  email: string;
  name: string;
};

type Rendered = { subject: string; html: string; text: string };

const SUBJECTS: Partial<Record<EmailActionType, string>> = {
  signup: "Confirm your e-cert account",
  recovery: "Reset your e-cert password",
  magiclink: "Your e-cert sign-in link",
  email_change: "Confirm your new e-cert email",
  invite: "You've been invited to e-cert",
};

export function renderTemplate(input: RenderInput): Rendered {
  const subject = SUBJECTS[input.action] ?? "e-cert notification";
  const html = renderHtml(input);
  const text = renderText(input);
  return { subject, html, text };
}

const CONTAINER_STYLE = `max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d4d4d8;font-family:Georgia,'Times New Roman',serif;color:#27272a;`;
const BUTTON_STYLE = `display:inline-block;background:#27272a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;`;
const MUTED_STYLE = `color:#71717a;font-size:12px;font-family:Arial,Helvetica,sans-serif;`;

function layout(title: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;">
    <div style="${CONTAINER_STYLE}">
      <div style="padding:32px 32px 16px 32px;border-bottom:1px solid #e4e4e7;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#71717a;">e-cert</div>
        <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:600;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:24px 32px 32px 32px;font-size:15px;line-height:1.6;">
        ${body}
      </div>
      <div style="padding:16px 32px;border-top:1px solid #e4e4e7;${MUTED_STYLE}">
        If you didn't request this, you can safely ignore this email.
      </div>
    </div>
  </body>
</html>`;
}

function ctaBlock(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeAttr(url)}" style="${BUTTON_STYLE}">${escapeHtml(label)}</a></p>
<p style="${MUTED_STYLE}">Or copy and paste this link into your browser:<br/><span style="word-break:break-all;color:#3f3f46;">${escapeHtml(url)}</span></p>`;
}

function renderHtml(input: RenderInput): string {
  const greeting = `Hi ${escapeHtml(input.name)},`;

  switch (input.action) {
    case "signup":
      return layout(
        "Confirm your email",
        `${greeting}<p>Thanks for signing up for e-cert. Please confirm your email address to finish setting up your account.</p>${ctaBlock("Confirm email", input.confirmationUrl)}`,
      );
    case "recovery":
      return layout(
        "Reset your password",
        `${greeting}<p>We received a request to reset your e-cert password. Click the button below to choose a new one.</p>${ctaBlock("Reset password", input.confirmationUrl)}`,
      );
    case "magiclink":
      return layout(
        "Your sign-in link",
        `${greeting}<p>Click the button below to sign in to e-cert. This link expires shortly and can only be used once.</p>${ctaBlock("Sign in", input.confirmationUrl)}`,
      );
    case "email_change":
      return layout(
        "Confirm your new email",
        `${greeting}<p>Please confirm that you want to use <strong>${escapeHtml(input.email)}</strong> as your e-cert email address.</p>${ctaBlock("Confirm new email", input.confirmationUrl)}`,
      );
    case "invite":
      return layout(
        "You've been invited",
        `${greeting}<p>You've been invited to join e-cert. Click the button below to accept the invitation and set up your account.</p>${ctaBlock("Accept invitation", input.confirmationUrl)}`,
      );
    default:
      return layout(
        "Notification",
        `${greeting}<p>Use the link below to continue.</p>${ctaBlock("Continue", input.confirmationUrl)}`,
      );
  }
}

function renderText(input: RenderInput): string {
  switch (input.action) {
    case "signup":
      return `Hi ${input.name},\n\nThanks for signing up for e-cert. Please confirm your email address to finish setting up your account:\n${input.confirmationUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
    case "recovery":
      return `Hi ${input.name},\n\nWe received a request to reset your e-cert password. Use the link below to choose a new one:\n${input.confirmationUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
    case "magiclink":
      return `Hi ${input.name},\n\nClick the link below to sign in to e-cert. It expires shortly and can only be used once:\n${input.confirmationUrl}`;
    case "email_change":
      return `Hi ${input.name},\n\nPlease confirm that you want to use ${input.email} as your e-cert email address:\n${input.confirmationUrl}`;
    case "invite":
      return `Hi ${input.name},\n\nYou've been invited to join e-cert. Use the link below to accept the invitation:\n${input.confirmationUrl}`;
    default:
      return `Hi ${input.name},\n\nContinue here:\n${input.confirmationUrl}`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
