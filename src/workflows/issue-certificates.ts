import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/features/audit/server/audit.service";
import { EventRepository } from "@/features/events/server/event.repository";
import { EventAttendeeRepository } from "@/features/events/server/attendee.repository";
import * as certService from "@/features/certificates/server/certificate.service";
import { sendCertificateEmail } from "@/features/certificates/server/certificate-email.service";
import type { Event } from "@/types/event";

type AttendeeResult = {
  name: string;
  email: string;
  success: boolean;
  certNumber?: string;
  error?: string;
};

export async function issueCertificatesWorkflow(
  eventId: string,
  attendeeIds: string[],
  userId: string,
  sendEmail: boolean
): Promise<{
  issued: number;
  emailed: number;
  results: AttendeeResult[];
}> {
  const eventRepo = new EventRepository(supabaseAdmin);
  const event = await eventRepo.findById(eventId);

  if (!event) {
    await logAudit({
      organization_id: "",
      user_id: userId,
      action: "workflow.error",
      source: "workflow",
      entity_type: "certificate",
      entity_id: eventId,
      details: { workflow: "issueCertificates", error: "Event not found" },
      client: supabaseAdmin,
    });
    throw new Error(`Event ${eventId} not found`);
  }

  const results: AttendeeResult[] = [];
  let issued = 0;
  let emailed = 0;

  for (const attendeeId of attendeeIds) {
    const result = await issueForAttendee(
      event,
      attendeeId,
      userId,
      sendEmail
    );

    results.push(result);
    if (result.success) {
      issued++;
      if (result.emailed) emailed++;
    }
  }

  const failed = results.filter((r) => !r.success).length;
  logAudit({
    organization_id: event.organization_id ?? "",
    user_id: userId,
    action: "certificate.issued",
    source: "workflow",
    entity_type: "event",
    entity_id: eventId,
    details: {
      issued,
      emailed,
      failed,
      total: attendeeIds.length,
      results,
    },
    client: supabaseAdmin,
  }).catch(console.error);

  return { issued, emailed, results };
}

async function issueForAttendee(
  event: Event,
  attendeeId: string,
  userId: string,
  sendEmail: boolean
): Promise<AttendeeResult & { emailed?: boolean }> {
  const attendeeRepo = new EventAttendeeRepository(supabaseAdmin);
  const attendee = await attendeeRepo.findById(attendeeId);

  if (!attendee) {
    return { name: "?", email: "?", success: false, error: "Attendee not found" };
  }

  try {
    let certId = attendee.certificate_id;

    if (!certId) {
      const hasUpload =
        attendee.metadata?.generation_mode === "file" &&
        attendee.metadata?.file_data;

      const result = await certService.issueCertificate(
        {
          organization_id: attendee.organization_id,
          event_id: event.id,
          template_id: event.template_id ?? undefined,
          recipient_name: attendee.name,
          recipient_email: attendee.email,
          expires_at: event.valid_until ?? undefined,
          metadata: { attendee_id: attendee.id },
          skip_pdf: true,
          ...(hasUpload
            ? { existing_pdf_base64: attendee.metadata!.file_data as string }
            : {}),
          event: {
            name: event.name,
            event_date: event.event_date,
            location: event.location,
            organizer: event.organizer,
            certificate_title: event.certificate_title,
            certificate_number_pattern: event.certificate_number_pattern,
          },
        },
        supabaseAdmin
      );

      if (result.error || !result.certificate) {
        if (result.error?.includes("already exists")) {
          const { CertificateRepository } = await import(
            "@/features/certificates/server/certificate.repository"
          );
          const certRepo = new CertificateRepository(supabaseAdmin);
          const existing = await certRepo.findByEventAndEmail(event.id, attendee.email);
          if (existing) {
            certId = existing.id;
          }
        }
        if (!certId) {
          return {
            name: attendee.name,
            email: attendee.email,
            success: false,
            error: result.error ?? "Failed to issue",
          };
        }
      } else {
        certId = result.certificate.id;
      }
    }

    let emailed = false;
    if (sendEmail && certId) {
      const { CertificateRepository } = await import(
        "@/features/certificates/server/certificate.repository"
      );
      const certRepo = new CertificateRepository(supabaseAdmin);
      const certificate = await certRepo.findById(certId);
      
      const emailResult = await sendCertificateEmail(certId, userId, supabaseAdmin, {
        skip_pdf: true,
        certificate: certificate ?? undefined,
        event,
      });
      emailed = emailResult.success;
      if (!emailResult.success) {
        logAudit({
          organization_id: attendee.organization_id,
          user_id: userId,
          action: "email.failed",
          source: "workflow",
          entity_type: "certificate",
          entity_id: certId,
          details: {
            attendee_id: attendee.id,
            attendee_email: attendee.email,
            error: emailResult.error ?? "Email failed",
          },
          client: supabaseAdmin,
        }).catch(console.error);
        return {
          name: attendee.name,
          email: attendee.email,
          success: false,
          emailed: false,
          error: emailResult.error ?? "Email failed",
        };
      }
    }

    return {
      name: attendee.name,
      email: attendee.email,
      success: true,
      emailed,
      certNumber: undefined,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logAudit({
      organization_id: attendee.organization_id,
      user_id: userId,
      action: "workflow.error",
      source: "workflow",
      entity_type: "certificate",
      entity_id: attendeeId,
      details: {
        workflow: "issueForAttendee",
        attendee_id: attendee.id,
        attendee_email: attendee.email,
        error: errorMessage,
      },
      client: supabaseAdmin,
    }).catch(console.error);
    return {
      name: attendee.name,
      email: attendee.email,
      success: false,
      error: errorMessage,
    };
  }
}
