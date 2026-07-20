import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailProvider, SendEmailOptions } from "./types";

export class NodemailerProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
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

    const result = await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toStr,
      subject,
      html,
      text,
      attachments,
    });

    console.log(`[Nodemailer] Success: messageId=${result.messageId}, accepted=${result.accepted}, rejected=${result.rejected}`);
  }
}
