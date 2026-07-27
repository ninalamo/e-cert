import { z } from "zod";

export const createEventSchema = z.object({
  organization_id: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  event_date: z.string().optional(),
  location: z.string().optional(),
  organizer: z.string().optional(),
  certificate_title: z.string().optional(),
  certificate_number_pattern: z.string().optional(),
  valid_until: z.string().optional(),
  template_id: z.string().optional(),
  email_template_id: z.string().optional(),
});

export const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  event_date: z.string().optional(),
  location: z.string().optional(),
  organizer: z.string().optional(),
  certificate_title: z.string().optional(),
  certificate_number_pattern: z.string().optional(),
  valid_until: z.string().optional(),
  status: z.enum(["draft", "active", "archive"]).optional(),
  template_id: z.string().optional(),
  email_template_id: z.string().optional(),
});

export const issueEventCertificateSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  organization_id: z.string().min(1, "Organization ID is required"),
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_email: z.string().email("Invalid recipient email"),
  send_email: z.boolean().optional(),
});

export const bulkIssueEventCertificatesSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  organization_id: z.string().min(1, "Organization ID is required"),
  recipients: z
    .array(
      z.object({
        name: z.string().min(1, "Recipient name is required"),
        email: z.string().email("Invalid recipient email"),
      })
    )
    .min(1, "At least one recipient is required"),
  send_email: z.boolean().optional(),
});
