import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailProvider, SendEmailOptions } from "./types";

export class NodemailerProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocalhost) {
      console.log(`[Nodemailer:dev] SMTP config:`, {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: Number(process.env.SMTP_PORT) === 465,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        hasPass: !!process.env.SMTP_PASS,
      });
    }
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, subject, html, text, attachments } = options;
    const toStr = Array.isArray(to) ? to.join(", ") : to;
    console.log(`[Nodemailer] Sending to=${toStr}, subject="${subject}", hasAttachments=${!!attachments?.length}`);

    try {
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: toStr,
        subject,
        html,
        text,
        attachments,
      });

      console.log(`[Nodemailer] Success: messageId=${result.messageId}, accepted=${result.accepted}, rejected=${result.rejected}`);
    } catch (err) {
      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      console.error(`[Nodemailer] Send failed:`, err);
      if (isLocalhost) {
        console.error(`[Nodemailer:dev] Full error:`, {
          message: err instanceof Error ? err.message : String(err),
          code: (err as { code?: string })?.code,
          response: (err as { response?: string })?.response,
          responseCode: (err as { responseCode?: number })?.responseCode,
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
      throw err;
    }
  }
}
