"use server";

import * as attendeeService from "./attendee.service";
import { requireRole } from "@/lib/permissions";
import type { AttendeeMetadata } from "@/types/event-attendee";
import {
  addAttendeeSchema,
  updateAttendeeSchema,
  bulkAddAttendeesSchema,
  issueCertificatesForCompletedSchema,
} from "../schemas/attendee.schema";

export async function getAttendeesAction(eventId: string) {
  const attendees = await attendeeService.getAttendees(eventId);

  return attendees;
}

export async function addAttendeeAction(data: {
  event_id: string;
  organization_id: string;
  name: string;
  email: string;
  file_path?: string;
  mode?: "template" | "file";
  file_data?: string;
  file_name?: string;
  file_type?: string;
}) {
  await requireRole(["admin", "staff"]);
  const parsed = addAttendeeSchema.parse(data);
  const metadata: Record<string, unknown> = {};
  if (parsed.mode) metadata.generation_mode = parsed.mode;
  if (parsed.file_data) metadata.file_data = parsed.file_data;
  if (parsed.file_name) metadata.file_name = parsed.file_name;
  if (parsed.file_type) metadata.file_type = parsed.file_type;
  return attendeeService.addAttendee({
    event_id: parsed.event_id,
    organization_id: parsed.organization_id,
    name: parsed.name,
    email: parsed.email,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });
}

export async function updateAttendeeAction(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    attended: boolean;
    completed: boolean;
    metadata: Record<string, unknown>;
  }>
) {
  await requireRole(["admin", "staff"]);
  const parsed = updateAttendeeSchema.parse(data);
  return attendeeService.updateAttendee(id, parsed);
}

export async function removeAttendeeAction(id: string) {
  await requireRole(["admin", "staff"]);
  return attendeeService.removeAttendee(id);
}

export async function removeAttendeeWithCertAction(id: string) {
  await requireRole(["admin"]);
  return attendeeService.removeAttendeeWithCert(id);
}

export async function getAttendeeDeletePreviewAction(id: string) {
  await requireRole(["admin"]);
  return attendeeService.getAttendeeDeletePreview(id);
}

export async function getAttendeeFileDataAction(id: string) {
  await requireRole(["admin", "staff"]);
  return attendeeService.getAttendeeFileData(id);
}

export async function bulkAddAttendeesAction(data: {
  event_id: string;
  organization_id: string;
  attendees: Array<{ name: string; email: string; metadata?: AttendeeMetadata }>;
}) {
  await requireRole(["admin", "staff"]);
  const parsed = bulkAddAttendeesSchema.parse(data);
  return attendeeService.bulkAddAttendees(
    parsed.event_id,
    parsed.organization_id,
    data.attendees
  );
}

export async function issueCertificatesForCompletedAction(
  eventId: string,
  options?: { send_email?: boolean; attendeeIds?: string[] }
) {
  const session = await requireRole(["admin", "staff"]);
  const parsed = issueCertificatesForCompletedSchema.parse(options ?? {});
  return attendeeService.issueCertificatesForCompleted(eventId, {
    send_email: parsed.send_email ?? true,
    user_id: session.id,
    attendeeIds: parsed.attendeeIds,
  });
}

export async function revokeExpiredForEventAction(eventId: string) {
  const session = await requireRole(["admin"]);
  return attendeeService.revokeExpiredForEvent(eventId, session.id);
}
