import { EventAttendeeRepository } from "./attendee.repository";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { EventRepository } from "./event.repository";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ORG_ID } from "@/lib/org";
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
  return repos(client ?? (await createClient())).attendeeRepo.findByEventIdLight(eventId);
}

export async function getAttendee(
  id: string,
  client?: SupabaseClient
): Promise<EventAttendee | null> {
  return repos(client ?? (await createClient())).attendeeRepo.findById(id);
}

export async function getAttendeeFileData(
  id: string,
  client?: SupabaseClient
): Promise<{ file_data: string | null; file_name: string | null; file_type: string | null } | null> {
  const attendee = await repos(client ?? (await createClient())).attendeeRepo.findById(id, "metadata");
  if (!attendee) return null;
  return {
    file_data: (attendee.metadata?.file_data as string) ?? null,
    file_name: (attendee.metadata?.file_name as string) ?? null,
    file_type: (attendee.metadata?.file_type as string) ?? null,
  };
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

  const exists = await attendeeRepo.findByEventAndEmailExists(data.event_id, data.email);
  if (exists) {
    return { attendee: null, error: "Attendee with this email already exists" };
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

export async function removeAttendeeWithCert(
  id: string,
  client?: SupabaseClient
): Promise<{ error?: string }> {
  const c = client ?? (await createClient());
  const { attendeeRepo, certRepo } = repos(c);

  const attendee = await attendeeRepo.findById(id, "id, certificate_id, email, event_id, organization_id");
  if (!attendee) {
    return { error: "Attendee not found" };
  }

  if (attendee.certificate_id) {
    const certId = attendee.certificate_id;

    await attendeeRepo.update(id, { certificate_id: null } as Partial<EventAttendee>);

    const certDeleted = await certRepo.delete(certId);
    if (!certDeleted) {
      return { error: "Failed to delete certificate" };
    }
  }

  const deleted = await attendeeRepo.delete(id);
  if (!deleted) {
    return { error: "Failed to remove attendee" };
  }

  const { count: otherEventCount } = await c
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("email", attendee.email)
    .neq("event_id", attendee.event_id);

  if ((otherEventCount ?? 0) === 0 && supabaseAdmin) {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", attendee.email)
      .maybeSingle();

    if (user) {
      await supabaseAdmin
        .from("user_memberships")
        .delete()
        .eq("user_id", user.id)
        .eq("organization_id", ORG_ID);

      await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", user.id);
    }
  }

  return {};
}

export async function getAttendeeDeletePreview(
  id: string,
  client?: SupabaseClient
): Promise<{
  hasCertificate: boolean;
  otherEventCount: number;
  hasUserAccount: boolean;
}> {
  const c = client ?? (await createClient());
  const { attendeeRepo } = repos(c);

  const attendee = await attendeeRepo.findById(id, "id, certificate_id, email, event_id");
  if (!attendee) return { hasCertificate: false, otherEventCount: 0, hasUserAccount: false };

  const hasCertificate = !!attendee.certificate_id;

  const { count: otherEventCount } = await c
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("email", attendee.email)
    .neq("event_id", attendee.event_id);

  const { data: user } = await c
    .from("users")
    .select("id")
    .eq("email", attendee.email)
    .maybeSingle();

  return {
    hasCertificate,
    otherEventCount: otherEventCount ?? 0,
    hasUserAccount: !!user,
  };
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
    const exists = await attendeeRepo.findByEventAndEmailExists(eventId, a.email);
    if (exists) {
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

  const event = (await eventRepo.findById(eventId)) as Event | null;
  if (!event) {
    return { issued: 0, emailed: 0, skipped: 0, results: [] };
  }

  const allAttendees = await attendeeRepo.findByEventIdLight(eventId);
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
    try {
      let certId = attendee.certificate_id;

      if (!certId) {
        let existing_pdf_base64: string | undefined;
        if (attendee.metadata?.generation_mode === "file") {
          const fullAttendee = await attendeeRepo.findById(attendee.id, "metadata");
          if (fullAttendee?.metadata?.file_data) {
            existing_pdf_base64 = fullAttendee.metadata.file_data as string;
          }
        }

        const result = await certService.issueCertificate({
          organization_id: attendee.organization_id,
          event_id: eventId,
          template_id: event.template_id ?? undefined,
          recipient_name: attendee.name,
          recipient_email: attendee.email,
          expires_at: event.valid_until ?? undefined,
          metadata: { attendee_id: attendee.id },
          skip_pdf: true,
          ...(existing_pdf_base64 ? { existing_pdf_base64 } : {}),
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
        const emailResult = await sendCertificateEmail(certId, options.user_id, c, { skip_pdf: true });
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

  return { issued, emailed, skipped: 0, results };
}
