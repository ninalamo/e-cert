import { CertificateRepository } from "./certificate.repository";
import { generateCertificateNumber } from "./certificate-number";
import type { Certificate } from "@/types/certificate";
import { renderHtmlToPdf } from "@/lib/pdf";
import { generateQrCode } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, ORG_NAME } from "@/lib/org";
import { env } from "@/lib/env";
import { renderTemplate } from "@/lib/template-renderer";
import { extractCanvasDimensions, buildQrReplacement } from "@/lib/certificate-renderer";
import { logAudit } from "@/features/audit/server/audit.service";
import type { SupabaseClient } from "@supabase/supabase-js";

function repo(client: SupabaseClient) {
  return new CertificateRepository(client);
}

export async function issueCertificate(
  data: {
    organization_id: string;
    event_id?: string;
    template_id?: string;
    recipient_name: string;
    recipient_email: string;
    expires_at?: string;
    metadata?: Record<string, unknown>;
    send_email?: boolean;
    user_id?: string;
    skip_pdf?: boolean;
    existing_pdf_base64?: string;
    attendee_certificate_number?: string;
    event?: {
      name?: string | null;
      event_date?: string | null;
      location?: string | null;
      organizer?: string | null;
      certificate_title?: string | null;
      certificate_number_pattern?: string | null;
    };
  },
  clientOverride?: SupabaseClient
): Promise<{ certificate: Certificate | null; error?: string; emailSent?: boolean }> {
  const client = clientOverride ?? (await createClient());
  const certRepo = repo(client);

  const number = data.attendee_certificate_number ?? await generateCertificateNumber({
    organizationId: data.organization_id,
    pattern: data.event?.certificate_number_pattern ?? null,
    client,
  });

  const baseUrl = env.client.NEXT_PUBLIC_BASE_URL;
  const verifyUrl = `${baseUrl}/verify?number=${number}`;
  const qrBuffer = await generateQrCode(verifyUrl, { width: 200, margin: 1 });
  const qrDataUrl = `data:image/png;base64,${qrBuffer.toString("base64")}`;

  let renderedHtml: string | null = null;
  let renderedPdfBase64: string | null = null;

  async function renderFromTemplate(templateId: string, skipPdf: boolean) {
    const { getTemplate } = await import("@/features/templates/server/template.service");
    const template = await getTemplate(templateId);
    if (!template) return;

    renderedHtml = renderTemplate(
      template.html_content,
      template.css_content ?? "",
      {
        recipient_name: data.recipient_name,
        certificate_number: number,
        issued_date: new Date().toLocaleDateString(),
        organization_name: ORG_NAME,
        event_name: data.event?.name ?? "",
        event_date: data.event?.event_date
          ? new Date(data.event.event_date).toLocaleDateString()
          : "",
        event_location: data.event?.location ?? "",
        event_organizer: data.event?.organizer ?? "",
        certificate_title: data.event?.certificate_title ?? "",
        expiry_date: data.expires_at
          ? new Date(data.expires_at).toLocaleDateString()
          : "",
        qr_code: buildQrReplacement(qrDataUrl),
      }
    );

    if (!skipPdf) {
      const { width: certW, height: certH } = extractCanvasDimensions(template.html_content);
      const pdfOrientation = certW >= certH ? "landscape" : "portrait";
      const pdfBuffer = await renderHtmlToPdf(renderedHtml, {
        format: "A4",
        landscape: pdfOrientation === "landscape",
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      renderedPdfBase64 = pdfBuffer.toString("base64");
    }
  }

  if (data.existing_pdf_base64) {
    renderedPdfBase64 = data.existing_pdf_base64;
  } else if (data.template_id) {
    await renderFromTemplate(data.template_id, !!data.skip_pdf);
  }

  const metadata: Record<string, unknown> = {
    ...(data.metadata ?? {}),
    ...(renderedHtml ? { rendered_html: renderedHtml } : {}),
    ...(renderedPdfBase64 ? { rendered_pdf: renderedPdfBase64 } : {}),
  };

  if (data.event_id) {
    const existing = await certRepo.findByEventAndEmail(
      data.event_id,
      data.recipient_email
    );
    if (existing) {
      return {
        certificate: null,
        error: "A certificate for this recipient already exists for this event",
      };
    }
  }

  const { data: rpcResult, error } = await client.rpc("issue_certificate_atomic", {
    p_org_id: data.organization_id,
    p_event_id: data.event_id ?? null,
    p_template_id: data.template_id ?? null,
    p_recipient_name: data.recipient_name,
    p_recipient_email: data.recipient_email,
    p_certificate_number: number,
    p_expires_at: data.expires_at ?? null,
    p_metadata: metadata,
  }).single();

  if (error || !rpcResult) {
    return { certificate: null, error: error?.message ?? "Failed to issue certificate" };
  }

  const certificate = rpcResult as Certificate;

  logAudit({
    organization_id: data.organization_id,
    user_id: data.user_id,
    action: "certificate.issued",
    source: "api",
    entity_type: "certificate",
    entity_id: certificate.id,
    details: {
      certificate_number: certificate.certificate_number,
      recipient_name: certificate.recipient_name,
      recipient_email: certificate.recipient_email,
      event_id: data.event_id,
      template_id: data.template_id,
    },
  }).catch(console.error);

  if (data.send_email && data.user_id) {
    const { sendCertificateEmail } = await import("./certificate-email.service");
    const emailResult = await sendCertificateEmail(certificate.id, data.user_id);
    return { certificate, emailSent: emailResult.success, error: emailResult.error };
  }

  return { certificate };
}

export async function getCertificates(
  organizationId: string,
  client?: SupabaseClient
): Promise<Certificate[]> {
  const certRepo = repo(client ?? (await createClient()));
  return certRepo.findByOrganizationId(organizationId);
}

export async function getCertificatesWithEvent(
  organizationId: string,
  client?: SupabaseClient
): Promise<{ data: Array<Certificate & { events: { name: string } | null }>; count: number }> {
  const certRepo = repo(client ?? (await createClient()));
  return certRepo.findByOrganizationIdWithEvent(organizationId);
}

export async function getCertificate(
  id: string,
  client?: SupabaseClient
): Promise<Certificate | null> {
  const certRepo = repo(client ?? (await createClient()));
  return certRepo.findById(id);
}

export async function getCertificateByNumber(
  number: string,
  client?: SupabaseClient
): Promise<Certificate | null> {
  const certRepo = repo(client ?? (await createClient()));
  return certRepo.findByCertificateNumber(number);
}

export async function getMyCertificates(
  email: string,
  columns?: string,
  client?: SupabaseClient
): Promise<Certificate[]> {
  const c = client ?? (await createClient());
  const certRepo = repo(c);
  return certRepo.findByRecipientEmail(email, ORG_ID, columns);
}

export async function getMyCertificatesWithEvent(
  email: string,
  columns?: string,
  client?: SupabaseClient
): Promise<Array<Certificate & { events: { name: string } | null }>> {
  const c = client ?? (await createClient());
  const certRepo = repo(c);
  return certRepo.findByRecipientEmailWithEvent(email, ORG_ID, columns);
}

export async function getMyCertificate(
  id: string,
  email: string,
  client?: SupabaseClient
): Promise<Certificate | null> {
  const certRepo = repo(client ?? (await createClient()));
  return certRepo.findByIdForRecipient(id, email);
}

export async function revokeCertificate(
  id: string,
  reason: string,
  userId?: string,
  client?: SupabaseClient
): Promise<{ certificate: Certificate | null; error?: string }> {
  const certRepo = repo(client ?? (await createClient()));
  const existing = await certRepo.findById(id);
  if (!existing) {
    return { certificate: null, error: "Certificate not found" };
  }

  if (existing.revoked_at) {
    return { certificate: null, error: "Certificate is already revoked" };
  }

  const certificate = await certRepo.update(id, {
    revoked_at: new Date().toISOString(),
    revoke_reason: reason,
  } as Partial<Certificate>);

  if (!certificate) {
    return { certificate: null, error: "Failed to revoke certificate" };
  }

  await logAudit({
    organization_id: ORG_ID,
    user_id: userId,
    action: "certificate.revoked",
    source: "ui",
    entity_type: "certificate",
    entity_id: id,
    details: {
      certificate_number: certificate.certificate_number,
      recipient_name: certificate.recipient_name,
      recipient_email: certificate.recipient_email,
      reason,
    },
  });

  if (existing.file_path) {
    try {
      const { getStorageProvider } = await import("@/lib/storage");
      const storage = getStorageProvider();
      await storage.deleteFile(existing.file_path);
    } catch (err) {
      console.error(`[revokeCertificate] Failed to delete stored file for ${id}:`, err);
    }
  }

  return { certificate };
}

export async function deleteCertificate(id: string, userId?: string, client?: SupabaseClient): Promise<{ certificate: Certificate | null; error?: string }> {
  const supabase = client ?? (await createClient());
  const certRepo = repo(supabase);
  const existing = await certRepo.findById(id);
  if (!existing) {
    return { certificate: null, error: "Certificate not found" };
  }

  // Nullify linked attendee's certificate_id before deleting
  const { EventAttendeeRepository } = await import("@/features/events/server/attendee.repository");
  const attendeeRepo = new EventAttendeeRepository(supabase);
  const linkedAttendees = await attendeeRepo.findMany({ certificate_id: id });
  for (const attendee of linkedAttendees) {
    await attendeeRepo.update(attendee.id, { certificate_id: null });
  }

  if (existing.file_path) {
    try {
      const { getStorageProvider } = await import("@/lib/storage");
      const storage = getStorageProvider();
      await storage.deleteFile(existing.file_path);
    } catch (err) {
      console.error(`[deleteCertificate] Failed to delete stored file for ${id}:`, err);
    }
  }

  const ok = await certRepo.delete(id);
  if (!ok) {
    return { certificate: null, error: "Failed to delete certificate" };
  }

  await logAudit({
    organization_id: ORG_ID,
    user_id: userId,
    action: "certificate.deleted",
    source: "ui",
    entity_type: "certificate",
    entity_id: id,
    details: {
      certificate_number: existing.certificate_number,
      recipient_name: existing.recipient_name,
      recipient_email: existing.recipient_email,
    },
  });

  return { certificate: existing };
}

export async function getCertificatePdfBuffer(certificate: Certificate): Promise<{ data: Buffer | null; error: string | null }> {
  if (certificate.file_path) {
    const { getStorageProvider } = await import("@/lib/storage");
    const storage = getStorageProvider();
    try {
      return { data: await storage.readFile(certificate.file_path), error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  const meta = (certificate.metadata as Record<string, unknown> | null) ?? {};

  const renderedPdf = meta.rendered_pdf;
  if (typeof renderedPdf === "string") {
    return { data: Buffer.from(renderedPdf, "base64"), error: null };
  }

  const renderedHtml = meta.rendered_html;
  if (typeof renderedHtml === "string") {
    const { renderHtmlToPdf } = await import("@/lib/pdf");
    const { width: certW, height: certH } = extractCanvasDimensions(renderedHtml);
    const pdfOrientation = certW >= certH ? "landscape" : "portrait";
    try {
      const pdfBuffer = await renderHtmlToPdf(renderedHtml, {
        format: "A4",
        landscape: pdfOrientation === "landscape",
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      return { data: pdfBuffer, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  return { data: null, error: "Certificate PDF not found" };
}

export async function autoRevokeExpiredCertificates(client?: SupabaseClient): Promise<{ revoked: number; error?: string }> {
  const supabase = client ?? (await createClient());
  const certRepo = repo(supabase);

  const expired = await certRepo.findMany(
    { revoked_at: null },
    { columns: "id, certificate_number, recipient_name, recipient_email, file_path, organization_id", orderBy: "created_at", ascending: true }
  );

  const now = new Date().toISOString();
  let revoked = 0;

  for (const cert of expired) {
    if (cert.expires_at && new Date(cert.expires_at) < new Date()) {
      const updated = await certRepo.update(cert.id, {
        revoked_at: now,
        revoke_reason: "Auto-revoked: certificate expired",
      } as Partial<Certificate>);

      if (updated) {
        const { EventAttendeeRepository } = await import("@/features/events/server/attendee.repository");
        const attendeeRepo = new EventAttendeeRepository(supabase);
        const linkedAttendees = await attendeeRepo.findMany({ certificate_id: cert.id });
        for (const attendee of linkedAttendees) {
          await attendeeRepo.update(attendee.id, { certificate_id: null });
        }

        await logAudit({
          organization_id: cert.organization_id ?? ORG_ID,
          action: "certificate.revoked",
          source: "system",
          entity_type: "certificate",
          entity_id: cert.id,
          details: {
            certificate_number: cert.certificate_number,
            recipient_name: cert.recipient_name,
            recipient_email: cert.recipient_email,
            reason: "Auto-revoked: certificate expired",
          },
        });

        if (cert.file_path) {
          try {
            const { getStorageProvider } = await import("@/lib/storage");
            const storage = getStorageProvider();
            await storage.deleteFile(cert.file_path);
          } catch (err) {
            console.error(`[autoRevokeExpired] Failed to delete stored file for ${cert.id}:`, err);
          }
        }

        revoked++;
      }
    }
  }

  return { revoked };
}

export async function getExpiringCertificates(days: number, client?: SupabaseClient): Promise<Certificate[]> {
  const supabase = client ?? (await createClient());
  const certRepo = repo(supabase);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const expired = await certRepo.findMany(
    { revoked_at: null },
    { columns: "id, certificate_number, recipient_name, recipient_email, expires_at, organization_id, file_path" }
  );

  return expired.filter(
    (c) => c.expires_at && new Date(c.expires_at) < cutoff && new Date(c.expires_at) >= new Date()
  );
}
