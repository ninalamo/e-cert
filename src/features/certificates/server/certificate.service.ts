import { CertificateRepository } from "./certificate.repository";
import { generateCertificateNumber } from "./certificate-number";
import type { Certificate } from "@/types/certificate";
import { renderHtmlToPdf } from "@/lib/pdf";
import { generateQrCode } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, ORG_NAME } from "@/lib/org";
import { renderTemplate } from "@/lib/template-renderer";
import { extractCanvasDimensions, buildQrReplacement } from "@/lib/certificate-renderer";
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
  const number = await generateCertificateNumber({
    organizationId: data.organization_id,
    pattern: data.event?.certificate_number_pattern ?? null,
    client,
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?number=${number}`;
  const qrBuffer = await generateQrCode(verifyUrl, { width: 200, margin: 1 });
  const qrDataUrl = `data:image/png;base64,${qrBuffer.toString("base64")}`;

  let renderedHtml: string | null = null;
  let renderedPdfBase64: string | null = null;

  if (data.existing_pdf_base64) {
    renderedPdfBase64 = data.existing_pdf_base64;
  } else if (data.template_id && !data.skip_pdf) {
    const { getTemplate } = await import("@/features/templates/server/template.service");
    const template = await getTemplate(data.template_id);
    if (template) {
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

      const { width: certW, height: certH } = extractCanvasDimensions(template.html_content);
      const pdfOrientation = certW >= certH ? "landscape" : "portrait";
      const pdfBuffer = await renderHtmlToPdf(renderedHtml, {
        format: "A4",
        landscape: pdfOrientation === "landscape",
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      renderedPdfBase64 = pdfBuffer.toString("base64");
    }
  } else if (data.template_id && data.skip_pdf) {
    const { getTemplate } = await import("@/features/templates/server/template.service");
    const template = await getTemplate(data.template_id);
    if (template) {
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
    }
  }

  const metadata: Record<string, unknown> = {
    ...(data.metadata ?? {}),
    ...(renderedHtml ? { rendered_html: renderedHtml } : {}),
    ...(renderedPdfBase64 ? { rendered_pdf: renderedPdfBase64 } : {}),
  };

  const { data: certificate, error } = await certRepo.create({
    organization_id: data.organization_id,
    event_id: data.event_id ?? null,
    template_id: data.template_id ?? null,
    recipient_name: data.recipient_name,
    recipient_email: data.recipient_email,
    certificate_number: number,
    expires_at: data.expires_at ?? null,
    file_path: null,
    metadata,
  } as Partial<Certificate>);

  if (!certificate) {
    return { certificate: null, error: error ?? "Failed to issue certificate" };
  }

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

export async function deleteCertificate(id: string, client?: SupabaseClient): Promise<{ certificate: Certificate | null; error?: string }> {
  const certRepo = repo(client ?? (await createClient()));
  const existing = await certRepo.findById(id);
  if (!existing) {
    return { certificate: null, error: "Certificate not found" };
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

  return { certificate: existing };
}

export async function getCertificatePdfBuffer(certificate: Certificate): Promise<Buffer> {
  if (certificate.file_path) {
    const { getStorageProvider } = await import("@/lib/storage");
    const storage = getStorageProvider();
    return storage.readFile(certificate.file_path);
  }

  const meta = (certificate.metadata as Record<string, unknown> | null) ?? {};

  const renderedPdf = meta.rendered_pdf;
  if (typeof renderedPdf === "string") {
    return Buffer.from(renderedPdf, "base64");
  }

  const renderedHtml = meta.rendered_html;
  if (typeof renderedHtml === "string") {
    const { renderHtmlToPdf } = await import("@/lib/pdf");
    const { width: certW, height: certH } = extractCanvasDimensions(renderedHtml);
    const pdfOrientation = certW >= certH ? "landscape" : "portrait";
    const pdfBuffer = await renderHtmlToPdf(renderedHtml, {
      format: "A4",
      landscape: pdfOrientation === "landscape",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return pdfBuffer;
  }

  throw new Error("Certificate PDF not found");
}
