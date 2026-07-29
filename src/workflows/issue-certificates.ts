import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/features/audit/server/audit.service";
import { EventRepository } from "@/features/events/server/event.repository";
import { EventAttendeeRepository } from "@/features/events/server/attendee.repository";
import * as certService from "@/features/certificates/server/certificate.service";
import { sendCertificateEmail } from "@/features/certificates/server/certificate-email.service";

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
      eventId,
      event.name,
      event.template_id,
      event.valid_until,
      event.event_date,
      event.location,
      event.organizer,
      event.certificate_title,
      event.certificate_number_pattern,
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
  await logAudit({
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
  });

  return { issued, emailed, results };
}

async function issueForAttendee(
  eventId: string,
  eventName: string,
  templateId: string | null,
  validUntil: string | null,
  eventDate: string | null,
  location: string | null,
  organizer: string | null,
  certificateTitle: string | null,
  certificateNumberPattern: string,
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
          event_id: eventId,
          template_id: templateId ?? undefined,
          recipient_name: attendee.name,
          recipient_email: attendee.email,
          expires_at: validUntil ?? undefined,
          metadata: { attendee_id: attendee.id },
          skip_pdf: true,
          ...(hasUpload
            ? { existing_pdf_base64: attendee.metadata!.file_data as string }
            : {}),
          event: {
            name: eventName,
            event_date: eventDate,
            location,
            organizer,
            certificate_title: certificateTitle,
            certificate_number_pattern: certificateNumberPattern,
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
          const existing = await certRepo.findByEventAndEmail(eventId, attendee.email);
          if (existing) {
            certId = existing.id;
            await attendeeRepo.update(attendee.id, {
              certificate_id: certId,
            } as Partial<typeof attendee>);
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
        await attendeeRepo.update(attendee.id, {
          certificate_id: certId,
        } as Partial<typeof attendee>);
      }
    }

    let emailed = false;
    if (sendEmail && certId) {
      const emailResult = await sendCertificateEmail(certId, userId, supabaseAdmin, {
        skip_pdf: true,
      });
      emailed = emailResult.success;
      if (!emailResult.success) {
        await logAudit({
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
        });
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
    await logAudit({
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
    });
    return {
      name: attendee.name,
      email: attendee.email,
      success: false,
      error: errorMessage,
    };
  }
}
