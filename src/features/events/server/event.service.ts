import { EventRepository } from "./event.repository";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { CertificateTemplateRepository } from "@/features/templates/server/template.repository";
import type { Event } from "@/types/event";

const eventRepo = new EventRepository();
const certRepo = new CertificateRepository();
const templateRepo = new CertificateTemplateRepository();

export async function getEvents(organizationId: string): Promise<Event[]> {
  return eventRepo.findByOrganizationId(organizationId);
}

export async function getEvent(id: string): Promise<Event | null> {
  return eventRepo.findById(id);
}

export async function getEventWithStats(id: string) {
  const event = await eventRepo.findById(id);
  if (!event) return null;

  const allCerts = await certRepo.findMany({ event_id: id });
  const template = event.template_id ? await templateRepo.findById(event.template_id) : null;

  return {
    event,
    template,
    stats: {
      total: allCerts.length,
      active: allCerts.filter((c) => !c.revoked_at).length,
      revoked: allCerts.filter((c) => !!c.revoked_at).length,
    },
    certificates: allCerts,
  };
}

export async function createEvent(
  data: Pick<Event, "organization_id" | "name"> &
    Partial<Pick<Event, "description" | "event_date" | "location" | "organizer" | "certificate_title" | "valid_until" | "template_id">>
): Promise<{ event: Event | null; error?: string }> {
  const event = await eventRepo.create({
    ...data,
    description: data.description ?? null,
    event_date: data.event_date ?? null,
    location: data.location ?? null,
    organizer: data.organizer ?? null,
    certificate_title: data.certificate_title ?? "Certificate of Participation",
    valid_until: data.valid_until ?? null,
    template_id: data.template_id ?? null,
    status: "draft",
  } as Partial<Event>);

  if (!event) {
    return { event: null, error: "Failed to create event" };
  }
  return { event };
}

export async function updateEvent(
  id: string,
  data: Partial<Pick<Event, "name" | "description" | "event_date" | "location" | "organizer" | "certificate_title" | "valid_until" | "status" | "template_id">>
): Promise<{ event: Event | null; error?: string }> {
  const existing = await eventRepo.findById(id);
  if (!existing) {
    return { event: null, error: "Event not found" };
  }

  const event = await eventRepo.update(id, data as Partial<Event>);
  if (!event) {
    return { event: null, error: "Failed to update event" };
  }
  return { event };
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const existing = await eventRepo.findById(id);
  if (!existing) {
    return { error: "Event not found" };
  }
  const deleted = await eventRepo.delete(id);
  if (!deleted) {
    return { error: "Failed to delete event" };
  }
  return {};
}

export async function cloneTemplateForEvent(
  sourceTemplateId: string,
  eventId: string,
  eventName: string
): Promise<{ templateId: string | null; error?: string }> {
  const source = await templateRepo.findById(sourceTemplateId);
  if (!source) {
    return { templateId: null, error: "Source template not found" };
  }

  const template = await templateRepo.create({
    organization_id: source.organization_id,
    name: `${eventName} - ${source.name}`,
    description: source.description,
    html_content: source.html_content,
    css_content: source.css_content,
  });

  if (!template) {
    return { templateId: null, error: "Failed to clone template" };
  }

  await eventRepo.update(eventId, { template_id: template.id });
  return { templateId: template.id };
}
