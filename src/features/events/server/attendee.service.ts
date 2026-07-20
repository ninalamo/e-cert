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
 * Issue certificates for attendees that don't have one, and resend emails to all.
 * Returns a per-attendee result summary.
 */
export async function issueCertificatesForCompleted(
  eventId: string,
  options?: { send_email?: boolean; user_id?: string; attendeeIds?: string[] },
  client?: SupabaseClient
): Promise<{
  issued: number;
  emailed: number;
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

  console.log(`[AttendeeService] issueCertificatesForCompleted: eventId=${eventId}, options=${JSON.stringify({ send_email: options?.send_email, user_id: options?.user_id, attendeeIds: options?.attendeeIds })}`);

  const event = (await eventRepo.findById(eventId)) as Event | null;
  if (!event) {
    return { issued: 0, emailed: 0, skipped: 0, results: [] };
  }

  const allAttendees = await attendeeRepo.findByEventId(eventId);
  const all = options?.attendeeIds?.length
    ? allAttendees.filter((a) => options.attendeeIds!.includes(a.id))
    : allAttendees;

  let issued = 0;
  let emailed = 0;
  const results: Array<{
    name: string;
    email: string;
    success: boolean;
    certNumber?: string;
    error?: string;
  }> = [];

  for (const attendee of all) {
    console.log(`[AttendeeService] Processing attendee: ${attendee.name} (${attendee.email}), certificate_id=${attendee.certificate_id}`);
    try {
      let certId = attendee.certificate_id;

      if (!certId) {
        const hasUpload = attendee.metadata?.generation_mode === "file" && attendee.metadata?.file_data;

        const result = await certService.issueCertificate({
          organization_id: attendee.organization_id,
          event_id: eventId,
          template_id: event.template_id ?? undefined,
          recipient_name: attendee.name,
          recipient_email: attendee.email,
          expires_at: event.valid_until ?? undefined,
          metadata: { attendee_id: attendee.id },
          skip_pdf: true,
          ...(hasUpload ? { existing_pdf_base64: attendee.metadata!.file_data as string } : {}),
          event: {
            name: event.name,
            event_date: event.event_date,
            location: event.location,
            organizer: event.organizer,
            certificate_title: event.certificate_title,
            certificate_number_pattern: event.certificate_number_pattern,
          },
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

        certId = result.certificate.id;
        await attendeeRepo.update(attendee.id, {
          certificate_id: certId,
        } as Partial<EventAttendee>);
        issued++;
      }

      if (options?.send_email && certId && options?.user_id) {
        const { sendCertificateEmail } = await import(
          "@/features/certificates/server/certificate-email.service"
        );
        console.log(`[AttendeeService] Sending email for cert ${certId} to ${attendee.email} (user=${options.user_id})`);
        const emailResult = await sendCertificateEmail(certId, options.user_id, c, { skip_pdf: true });
        console.log(`[AttendeeService] Email result for ${attendee.email}: success=${emailResult.success}, error=${emailResult.error}`);
        if (emailResult.success) emailed++;
        else {
          results.push({
            name: attendee.name,
            email: attendee.email,
            success: false,
            error: emailResult.error ?? "Email failed",
          });
          continue;
        }
      } else {
        console.log(`[AttendeeService] Email skipped for ${attendee.email}: send_email=${options?.send_email}, certId=${certId}, user_id=${options?.user_id}`);
      }

      results.push({
        name: attendee.name,
        email: attendee.email,
        success: true,
        certNumber: certId ? undefined : undefined,
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

  console.log(`[AttendeeService] Done: issued=${issued}, emailed=${emailed}, results=${JSON.stringify(results)}`);
  return { issued, emailed, skipped: 0, results };
}
