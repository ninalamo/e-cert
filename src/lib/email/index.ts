import type { EmailProvider } from "./types";
import { NodemailerProvider } from "./nodemailer.provider";

export type { EmailProvider, SendEmailOptions, EmailAttachment } from "./types";

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    provider = new NodemailerProvider();
  }
  return provider;
}
