// Supabase Send Email Hook
// Replaces Supabase's default auth emails with our own branded templates,
// sent through the same Gmail SMTP used by src/lib/email/nodemailer.provider.ts.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { renderTemplate, type EmailActionType } from "./templates.ts";
import { sendViaNodemailer } from "./smtp.ts";

type HookPayload = {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
  };
};

const SUPPORTED_ACTIONS: EmailActionType[] = [
  "signup",
  "recovery",
  "magiclink",
  "email_change",
  "invite",
];

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!secret) {
    console.error("[send-email] SEND_EMAIL_HOOK_SECRET is not set");
    return new Response("Hook not configured", { status: 500 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));

  let parsed: HookPayload;
  try {
    parsed = wh.verify(payload, headers) as HookPayload;
  } catch (err) {
    console.error("[send-email] Signature verification failed:", err);
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const { user, email_data } = parsed;
  const action = email_data.email_action_type;

  if (!SUPPORTED_ACTIONS.includes(action)) {
    console.log(`[send-email] Skipping unsupported action: ${action}`);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const confirmationUrl = buildConfirmationUrl(email_data);
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
  const displayName = name || user.email.split("@")[0];

  const { subject, html, text } = renderTemplate({
    action,
    confirmationUrl,
    token: email_data.token,
    siteUrl: email_data.site_url,
    email: user.email,
    name: displayName,
  });

  try {
    await sendViaNodemailer({
      to: user.email,
      subject,
      html,
      text,
    });
    console.log(`[send-email] Sent ${action} email to ${user.email}`);
  } catch (err) {
    console.error(`[send-email] SMTP send failed for ${action} -> ${user.email}:`, err);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

function buildConfirmationUrl(email_data: HookPayload["email_data"]): string {
  const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const base = `${projectUrl}/auth/v1/verify`;
  const params = new URLSearchParams({
    token: email_data.token_hash,
    type: email_data.email_action_type,
    redirect_to: email_data.redirect_to,
  });
  return `${base}?${params.toString()}`;
}
