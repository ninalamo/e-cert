// SMTP transport for the Send Email Hook.
// Uses Gmail SMTP with the same credentials as src/lib/email/nodemailer.provider.ts.

import nodemailer from "npm:nodemailer@6.9.13";

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") ?? "587");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be set");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendViaNodemailer(input: SendInput): Promise<void> {
  const from = Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "";
  if (!from) throw new Error("SMTP_FROM is not set");

  await getTransporter().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
