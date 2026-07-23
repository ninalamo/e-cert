"use server";

import * as attendeeService from "./attendee.service";
import { requireRole } from "@/lib/permissions";
import type { AttendeeMetadata } from "@/types/event-attendee";

export async function getAttendeesAction(eventId: string) {
  const session = await requireRole(["admin", "staff"]);
  const attendees = await attendeeService.getAttendees(eventId);

  const userOrgIds = attendees.map((a) => a.organization_id);
  const uniqueOrgIds = [...new Set(userOrgIds)];

  console.log(`[AttendeeAction] getAttendeesAction: event=${eventId}, user=${session.id}, userRole=${session.role}, rows=${attendees.length}, attendeeOrgIds=${JSON.stringify(uniqueOrgIds)}`);

  if (attendees.length > 0) {
    const firstAttendeeOrg = attendees[0].organization_id;
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("user_memberships")
      .select("organization_id")
      .eq("user_id", session.id)
      .single();

    console.log(`[AttendeeAction] Org check: attendeeOrg=${firstAttendeeOrg}, membershipOrg=${membership?.organization_id ?? "NONE"}, match=${firstAttendeeOrg === membership?.organization_id}`);
  }

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
  const metadata: Record<string, unknown> = {};
  if (data.mode) metadata.generation_mode = data.mode;
  if (data.file_data) metadata.file_data = data.file_data;
  if (data.file_name) metadata.file_name = data.file_name;
  if (data.file_type) metadata.file_type = data.file_type;
  return attendeeService.addAttendee({
    event_id: data.event_id,
    organization_id: data.organization_id,
    name: data.name,
    email: data.email,
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
  return attendeeService.updateAttendee(id, data);
}

export async function removeAttendeeAction(id: string) {
  await requireRole(["admin", "staff"]);
  return attendeeService.removeAttendee(id);
}

export async function bulkAddAttendeesAction(data: {
  event_id: string;
  organization_id: string;
  attendees: Array<{ name: string; email: string; metadata?: AttendeeMetadata }>;
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
  options?: { send_email?: boolean; attendeeIds?: string[] }
) {
  const session = await requireRole(["admin", "staff"]);
  return attendeeService.issueCertificatesForCompleted(eventId, {
    send_email: options?.send_email ?? true,
    user_id: session.id,
    attendeeIds: options?.attendeeIds,
  });
}
