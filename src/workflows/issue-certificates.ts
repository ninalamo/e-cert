"use workflow";

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
  const event = await fetchEvent(eventId);

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

  return { issued, emailed, results };
}

async function fetchEvent(eventId: string) {
  "use step";

  const { createClient } = await import("@/lib/supabase/server");
  const { EventRepository } = await import(
    "@/features/events/server/event.repository"
  );

  const client = await createClient();
  const repo = new EventRepository(client);
  const event = await repo.findById(eventId);

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  return {
    name: event.name,
    template_id: event.template_id,
    valid_until: event.valid_until,
    event_date: event.event_date,
    location: event.location,
    organizer: event.organizer,
    certificate_title: event.certificate_title,
    certificate_number_pattern: event.certificate_number_pattern,
  };
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
  "use step";

  const { createClient } = await import("@/lib/supabase/server");
  const { EventAttendeeRepository } = await import(
    "@/features/events/server/attendee.repository"
  );
  const certService = await import(
    "@/features/certificates/server/certificate.service"
  );

  const client = await createClient();
  const attendeeRepo = new EventAttendeeRepository(client);
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

      const result = await certService.issueCertificate({
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
      });

      if (result.error || !result.certificate) {
        return {
          name: attendee.name,
          email: attendee.email,
          success: false,
          error: result.error ?? "Failed to issue",
        };
      }

      certId = result.certificate.id;
      await attendeeRepo.update(attendee.id, {
        certificate_id: certId,
      } as Partial<typeof attendee>);
    }

    let emailed = false;
    if (sendEmail && certId) {
      const { sendCertificateEmail } = await import(
        "@/features/certificates/server/certificate-email.service"
      );
      const emailResult = await sendCertificateEmail(certId, userId, client, {
        skip_pdf: true,
      });
      emailed = emailResult.success;
      if (!emailResult.success) {
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
    return {
      name: attendee.name,
      email: attendee.email,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
