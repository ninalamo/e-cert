import { EventAttendeeRepository } from "./attendee.repository";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { EventRepository } from "./event.repository";
import { createClient } from "@/lib/supabase/server";
import type { EventAttendee, AttendeeMetadata } from "@/types/event-attendee";
import type { Event } from "@/types/event";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as certService from "@/features/certificates/server/certificate.service";

function repos(client: SupabaseClient) {
  return {
    attendeeRepo: new EventAttendeeRepository(client),
    certRepo: new CertificateRepository(client),
    eventRepo: new EventRepository(client),
  };
}

export async function getAttendees(
  eventId: string,
  client?: SupabaseClient
): Promise<EventAttendee[]> {
  return repos(client ?? (await createClient())).attendeeRepo.findByEventId(eventId);
}

export async function getAttendee(
  id: string,
  client?: SupabaseClient
): Promise<EventAttendee | null> {
  return repos(client ?? (await createClient())).attendeeRepo.findById(id);
}

export async function addAttendee(
  data: {
    event_id: string;
    organization_id: string;
    name: string;
    email: string;
    metadata?: Record<string, unknown>;
  },
  client?: SupabaseClient
): Promise<{ attendee: EventAttendee | null; error?: string }> {
  const c = client ?? (await createClient());
  const { attendeeRepo } = repos(c);

  const existing = await attendeeRepo.findByEventAndEmail(data.event_id, data.email);
  if (existing) {
    return { attendee: existing, error: "Attendee with this email already exists" };
  }

  const { data: attendee } = await attendeeRepo.create({
    event_id: data.event_id,
    organization_id: data.organization_id,
    name: data.name,
    email: data.email,
    attended: false,
    completed: false,
    metadata: data.metadata ?? null,
  } as Partial<EventAttendee>);

  if (!attendee) {
    return { attendee: null, error: "Failed to add attendee" };
  }
  return { attendee };
}

export async function updateAttendee(
  id: string,
  data: Partial<
    Pick<EventAttendee, "name" | "email" | "attended" | "completed" | "metadata">
  >,
  client?: SupabaseClient
): Promise<{ attendee: EventAttendee | null; error?: string }> {
  const c = client ?? (await createClient());
  const { attendeeRepo } = repos(c);

  const patch: Partial<EventAttendee> = { ...data };

  if (data.attended !== undefined) {
    patch.attended_at = data.attended ? new Date().toISOString() : null;
  }
  if (data.completed !== undefined) {
    patch.completed_at = data.completed ? new Date().toISOString() : null;
  }

  const attendee = await attendeeRepo.update(id, patch as Partial<EventAttendee>);
  if (!attendee) {
    return { attendee: null, error: "Failed to update attendee" };
  }
  return { attendee };
}

export async function removeAttendee(
  id: string,
  client?: SupabaseClient
): Promise<{ error?: string }> {
  const c = client ?? (await createClient());
  const { attendeeRepo } = repos(c);
  const deleted = await attendeeRepo.delete(id);
  if (!deleted) {
    return { error: "Failed to remove attendee" };
  }
  return {};
}

export async function bulkAddAttendees(
  eventId: string,
  organizationId: string,
  attendees: Array<{ name: string; email: string; metadata?: AttendeeMetadata }>,
  client?: SupabaseClient
): Promise<{
  added: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}> {
  const c = client ?? (await createClient());
  const { attendeeRepo } = repos(c);

  let added = 0;
  let skipped = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const a of attendees) {
    if (!a.email || !a.name) {
      skipped++;
      continue;
    }
    const existing = await attendeeRepo.findByEventAndEmail(eventId, a.email);
    if (existing) {
      skipped++;
      continue;
    }
    const { data: created } = await attendeeRepo.create({
      event_id: eventId,
      organization_id: organizationId,
      name: a.name,
      email: a.email,
      attended: false,
      completed: false,
      metadata: a.metadata ?? null,
    } as Partial<EventAttendee>);
    if (created) added++;
    else errors.push({ email: a.email, error: "Failed to add" });
  }

  return { added, skipped, errors };
}

/**
 * Issue certificates for every completed attendee of an event that does not
 * yet have one. Certificates are only issued to attendees that have both
 * attended and completed the event. Returns a per-attendee result summary.
 */
export async function issueCertificatesForCompleted(
  eventId: string,
  options?: { send_email?: boolean },
  client?: SupabaseClient
): Promise<{
  issued: number;
  skipped: number;
  results: Array<{
    name: string;
    email: string;
    success: boolean;
    certNumber?: string;
    error?: string;
  }>;
}> {
  const c = client ?? (await createClient());
  const { attendeeRepo, eventRepo } = repos(c);

  const event = (await eventRepo.findById(eventId)) as Event | null;
  if (!event) {
    return { issued: 0, skipped: 0, results: [] };
  }

  const eligible = await attendeeRepo.findCompletedWithoutCertificate(eventId);

  let issued = 0;
  const results: Array<{
    name: string;
    email: string;
    success: boolean;
    certNumber?: string;
    error?: string;
  }> = [];

  for (const attendee of eligible) {
    try {
      const result = await certService.issueCertificate({
        organization_id: attendee.organization_id,
        event_id: eventId,
        template_id: event.template_id ?? undefined,
        recipient_name: attendee.name,
        recipient_email: attendee.email,
        expires_at: event.valid_until ?? undefined,
        send_email: options?.send_email ?? false,
        metadata: { attendee_id: attendee.id },
      });

      if (result.error || !result.certificate) {
        results.push({
          name: attendee.name,
          email: attendee.email,
          success: false,
          error: result.error ?? "Failed to issue",
        });
        continue;
      }

      await attendeeRepo.update(attendee.id, {
        certificate_id: result.certificate.id,
      } as Partial<EventAttendee>);

      issued++;
      results.push({
        name: attendee.name,
        email: attendee.email,
        success: true,
        certNumber: result.certificate.certificate_number,
      });
    } catch (err) {
      results.push({
        name: attendee.name,
        email: attendee.email,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { issued, skipped: 0, results };
}
