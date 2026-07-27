import { z } from "zod";

export const issueCertificateSchema = z.object({
  organization_id: z.string().min(1, "Organization ID is required"),
  template_id: z.string().optional(),
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_email: z.string().email("Invalid recipient email"),
  expires_at: z.string().optional(),
  file_path: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  send_email: z.boolean().optional(),
});

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
