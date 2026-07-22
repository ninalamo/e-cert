import { EventRepository } from "./event.repository";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { CertificateTemplateRepository } from "@/features/templates/server/template.repository";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import type { SupabaseClient } from "@supabase/supabase-js";

function repos(client: SupabaseClient) {
  return {
    eventRepo: new EventRepository(client),
    certRepo: new CertificateRepository(client),
    templateRepo: new CertificateTemplateRepository(client),
  };
}

export async function getEvents(
  organizationId: string,
  client?: SupabaseClient
): Promise<Event[]> {
  return repos(client ?? (await createClient())).eventRepo.findByOrganizationId(organizationId);
}

export async function getEventsPaginated(
  organizationId: string,
  options: {
    search?: string;
    statuses?: string[];
    limit: number;
    offset: number;
    columns?: string;
  },
  client?: SupabaseClient
): Promise<{ events: Event[]; total: number }> {
  return repos(client ?? (await createClient())).eventRepo.findPaginated(organizationId, options);
}

export async function getEvent(
  id: string,
  client?: SupabaseClient
): Promise<Event | null> {
  return repos(client ?? (await createClient())).eventRepo.findById(id);
}

export async function getEventWithStats(id: string, client?: SupabaseClient) {
  const { eventRepo, certRepo, templateRepo } = repos(client ?? (await createClient()));

  const [event, allCerts] = await Promise.all([
    eventRepo.findById(id),
    certRepo.findMany({ event_id: id }, { columns: "id, revoked_at, expires_at, certificate_number, recipient_name, recipient_email" }),
  ]);
  if (!event) return null;

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
    Partial<Pick<Event, "description" | "event_date" | "location" | "organizer" | "certificate_title" | "certificate_number_pattern" | "valid_until" | "template_id">>,
  client?: SupabaseClient
): Promise<{ event: Event | null; error?: string }> {
  const { data: event, error } = await repos(client ?? (await createClient())).eventRepo.create({
    ...data,
    description: data.description ?? null,
    event_date: data.event_date ?? null,
    location: data.location ?? null,
    organizer: data.organizer ?? null,
    certificate_title: data.certificate_title ?? "Certificate of Participation",
    certificate_number_pattern: data.certificate_number_pattern ?? "EPOCH",
    valid_until: data.valid_until ?? null,
    template_id: data.template_id ?? null,
    status: "draft",
  } as Partial<Event>);

  if (!event) {
    return { event: null, error: error ?? "Failed to create event" };
  }
  return { event };
}

export async function updateEvent(
  id: string,
  data: Partial<Pick<Event, "name" | "description" | "event_date" | "location" | "organizer" | "certificate_title" | "certificate_number_pattern" | "valid_until" | "status" | "template_id">>,
  client?: SupabaseClient
): Promise<{ event: Event | null; error?: string }> {
  const { eventRepo } = repos(client ?? (await createClient()));
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

export async function deleteEvent(
  id: string,
  client?: SupabaseClient
): Promise<{ error?: string }> {
  const { eventRepo, certRepo } = repos(client ?? (await createClient()));
  const existing = await eventRepo.findById(id);
  if (!existing) {
    return { error: "Event not found" };
  }
  await certRepo.deleteByEventId(id);
  const deleted = await eventRepo.delete(id);
  if (!deleted) {
    return { error: "Failed to delete event" };
  }
  return {};
}

export async function cloneTemplateForEvent(
  sourceTemplateId: string,
  eventId: string,
  cloneName: string,
  client?: SupabaseClient
): Promise<{ templateId: string | null; error?: string }> {
  const { eventRepo, templateRepo } = repos(client ?? (await createClient()));
  const source = await templateRepo.findById(sourceTemplateId);
  if (!source) {
    return { templateId: null, error: "Source template not found" };
  }

  const { data: template, error: cloneError } = await templateRepo.create({
    organization_id: source.organization_id,
    name: cloneName,
    description: source.description,
    html_content: source.html_content,
    css_content: source.css_content,
  });

  if (!template) {
    return { templateId: null, error: cloneError ?? "Failed to clone template" };
  }

  await eventRepo.update(eventId, { template_id: template.id });
  return { templateId: template.id };
}

export async function getTemplateForClone(
  templateId: string,
  client?: SupabaseClient
): Promise<CertificateTemplate | null> {
  const { templateRepo } = repos(client ?? (await createClient()));
  return templateRepo.findById(templateId);
}
