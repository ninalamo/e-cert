import { z } from "zod";

export const addAttendeeSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  organization_id: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1, "Attendee name is required"),
  email: z.string().email("Invalid attendee email"),
  file_path: z.string().optional(),
  mode: z.enum(["template", "file"]).optional(),
  file_data: z.string().optional(),
  file_name: z.string().optional(),
  file_type: z.string().optional(),
});

export const updateAttendeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  attended: z.boolean().optional(),
  completed: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const bulkAddAttendeesSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  organization_id: z.string().min(1, "Organization ID is required"),
  attendees: z
    .array(
      z.object({
        name: z.string().min(1, "Attendee name is required"),
        email: z.string().email("Invalid attendee email"),
      })
    )
    .min(1, "At least one attendee is required"),
});

export const issueCertificatesForCompletedSchema = z.object({
  send_email: z.boolean().optional(),
  attendeeIds: z.array(z.string()).optional(),
});
