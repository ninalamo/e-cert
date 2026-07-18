"use server";

import * as attendeeService from "./attendee.service";
import { requireRole } from "@/lib/permissions";

export async function getAttendeesAction(eventId: string) {
  await requireRole(["admin", "staff"]);
  return attendeeService.getAttendees(eventId);
}

export async function addAttendeeAction(data: {
  event_id: string;
  organization_id: string;
  name: string;
  email: string;
}) {
  await requireRole(["admin", "staff"]);
  return attendeeService.addAttendee(data);
}

export async function updateAttendeeAction(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    attended: boolean;
    completed: boolean;
  }>
) {
  await requireRole(["admin", "staff"]);
  return attendeeService.updateAttendee(id, data);
}

export async function removeAttendeeAction(id: string) {
  await requireRole(["admin", "staff"]);
  return attendeeService.removeAttendee(id);
}

export async function bulkAddAttendeesAction(data: {
  event_id: string;
  organization_id: string;
  attendees: Array<{ name: string; email: string }>;
}) {
  await requireRole(["admin", "staff"]);
  return attendeeService.bulkAddAttendees(
    data.event_id,
    data.organization_id,
    data.attendees
  );
}

export async function issueCertificatesForCompletedAction(
  eventId: string,
  options?: { send_email?: boolean }
) {
  await requireRole(["admin", "staff"]);
  return attendeeService.issueCertificatesForCompleted(eventId, options);
}
