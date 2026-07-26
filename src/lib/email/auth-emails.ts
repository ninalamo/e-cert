import { getEmailProvider } from "./index";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const ORG_NAME = "Lyceum Of Alabang";

function wrap(title: string, body: string): string {
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
              <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${ORG_NAME}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This is a security notification from ${ORG_NAME}.
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

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<void> {
  const url = `${BASE_URL}/update-password?token=${resetToken}`;
  const provider = getEmailProvider();

  const html = wrap("Reset Your Password", `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Reset Your Password</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new password.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center">
          <a href="${url}" style="display:inline-block;background-color:#4f39f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0;font-size:13px;color:#4f39f6;word-break:break-all;">
      <a href="${url}" style="color:#4f39f6;">${url}</a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  `);

  await provider.sendEmail({
    to: email,
    subject: `Reset Your Password — ${ORG_NAME}`,
    html,
    text: `Reset your password: ${url}\n\nThis link expires in 1 hour.`,
  });
}

export async function sendConfirmationEmail(
  email: string,
  confirmToken: string,
): Promise<void> {
  const url = `${BASE_URL}/auth/confirm?token=${confirmToken}`;
  const provider = getEmailProvider();

  const html = wrap("Confirm Your Email", `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Confirm Your Email</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;">
      Thanks for signing up! Please confirm your email address to get started.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center">
          <a href="${url}" style="display:inline-block;background-color:#4f39f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
            Confirm Email
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0;font-size:13px;color:#4f39f6;word-break:break-all;">
      <a href="${url}" style="color:#4f39f6;">${url}</a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
  `);

  await provider.sendEmail({
    to: email,
    subject: `Confirm Your Email — ${ORG_NAME}`,
    html,
    text: `Confirm your email: ${url}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string | null,
): Promise<void> {
  const provider = getEmailProvider();
  const greeting = name ? `Hi ${name}` : "Hi there";

  const html = wrap("Welcome!", `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome to ${ORG_NAME}!</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;">
      ${greeting}, your account has been created successfully. You can now log in to access your certificates and profile.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center">
          <a href="${BASE_URL}/login" style="display:inline-block;background-color:#4f39f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
            Go to Login
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you have any questions, feel free to reach out to our support team.
    </p>
  `);

  await provider.sendEmail({
    to: email,
    subject: `Welcome to ${ORG_NAME}!`,
    html,
    text: `Welcome to ${ORG_NAME}! Log in at: ${BASE_URL}/login`,
  });
}
