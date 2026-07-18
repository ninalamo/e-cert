"use server";

import * as eventService from "./event.service";
import * as certService from "@/features/certificates/server/certificate.service";
import { requireSession } from "@/lib/permissions";

export async function getEventsAction(organizationId: string) {
  await requireSession();
  return eventService.getEvents(organizationId);
}

export async function getEventAction(id: string) {
  await requireSession();
  return eventService.getEvent(id);
}

export async function getEventWithStatsAction(id: string) {
  await requireSession();
  return eventService.getEventWithStats(id);
}

export async function createEventAction(data: {
  organization_id: string;
  name: string;
  description?: string;
  event_date?: string;
  location?: string;
  organizer?: string;
  certificate_title?: string;
  valid_until?: string;
  template_id?: string;
}) {
  await requireSession();
  return eventService.createEvent(data);
}

export async function updateEventAction(
  id: string,
  data: {
    name?: string;
    description?: string;
    event_date?: string;
    location?: string;
    organizer?: string;
    certificate_title?: string;
    valid_until?: string;
    status?: "draft" | "published" | "completed";
    template_id?: string;
  }
) {
  await requireSession();
  return eventService.updateEvent(id, data);
}

export async function deleteEventAction(id: string) {
  await requireSession();
  return eventService.deleteEvent(id);
}

export async function cloneTemplateForEventAction(
  sourceTemplateId: string,
  eventId: string,
  eventName: string
) {
  await requireSession();
  return eventService.cloneTemplateForEvent(sourceTemplateId, eventId, eventName);
}

export async function issueEventCertificateAction(data: {
  event_id: string;
  organization_id: string;
  recipient_name: string;
  recipient_email: string;
  send_email?: boolean;
}) {
  const session = await requireSession();
  const event = await eventService.getEvent(data.event_id);
  if (!event) {
    return { certificate: null, error: "Event not found" };
  }

  const certificate = await certService.issueCertificate({
    organization_id: data.organization_id,
    event_id: data.event_id,
    template_id: event.template_id ?? undefined,
    recipient_name: data.recipient_name,
    recipient_email: data.recipient_email,
    expires_at: event.valid_until ?? undefined,
    send_email: data.send_email ?? false,
    user_id: session.id,
  });

  return certificate;
}

export async function bulkIssueEventCertificatesAction(data: {
  event_id: string;
  organization_id: string;
  recipients: Array<{ name: string; email: string }>;
  send_email?: boolean;
}) {
  await requireSession();
  const event = await eventService.getEvent(data.event_id);
  if (!event) {
    return { results: [], error: "Event not found" };
  }

  const results: Array<{ name: string; email: string; success: boolean; certNumber?: string; error?: string }> = [];

  for (const recipient of data.recipients) {
    try {
      const result = await issueEventCertificateAction({
        event_id: data.event_id,
        organization_id: data.organization_id,
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        send_email: data.send_email ?? false,
      });

      results.push({
        name: recipient.name,
        email: recipient.email,
        success: !result.error,
        certNumber: result.certificate?.certificate_number,
        error: result.error,
      });
    } catch (err) {
      results.push({
        name: recipient.name,
        email: recipient.email,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results };
}
