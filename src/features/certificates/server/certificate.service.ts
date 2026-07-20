import { CertificateRepository } from "./certificate.repository";
import { generateCertificateNumber } from "./certificate-number";
import type { Certificate } from "@/types/certificate";
import { renderHtmlToPdf } from "@/lib/pdf";
import { generateQrCode } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import { ORG_NAME } from "@/lib/org";
import type { SupabaseClient } from "@supabase/supabase-js";

function repo(client: SupabaseClient) {
  return new CertificateRepository(client);
}

function renderTemplate(html: string, css: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
</head>
<body>
${rendered}
</body>
</html>`;
}

export async function issueCertificate(data: {
  organization_id: string;
  event_id?: string;
  template_id?: string;
  recipient_name: string;
  recipient_email: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
  send_email?: boolean;
  user_id?: string;
  event?: {
    name?: string | null;
    event_date?: string | null;
    location?: string | null;
    organizer?: string | null;
    certificate_title?: string | null;
  };
}): Promise<{ certificate: Certificate | null; error?: string; emailSent?: boolean }> {
  const client = await createClient();
  const certRepo = repo(client);
  const number = await generateCertificateNumber();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?number=${number}`;
  const qrBuffer = await generateQrCode(verifyUrl, { width: 128, margin: 1 });
  const qrDataUrl = `data:image/png;base64,${qrBuffer.toString("base64")}`;

  let renderedHtml: string | null = null;
  let renderedPdfBase64: string | null = null;

  if (data.template_id) {
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
          qr_code: `<img src="${qrDataUrl}" width="128" height="128" />`,
        }
      );

      const pdfBuffer = await renderHtmlToPdf(renderedHtml, {
        format: "A4",
        landscape: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      renderedPdfBase64 = pdfBuffer.toString("base64");
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
  client?: SupabaseClient
): Promise<Certificate[]> {
  const c = client ?? (await createClient());
  const certRepo = repo(c);
  const { ORG_ID } = await import("@/lib/org");
  return certRepo.findByRecipientEmail(email, ORG_ID);
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

  return { certificate };
}

export async function getCertificatePdfBuffer(certificate: Certificate): Promise<Buffer> {
  if (certificate.file_path) {
    const { getStorageProvider } = await import("@/lib/storage");
    const storage = getStorageProvider();
    return storage.readFile(certificate.file_path);
  }

  const renderedPdf = (certificate.metadata as Record<string, unknown> | null)
    ?.rendered_pdf;
  if (typeof renderedPdf === "string") {
    return Buffer.from(renderedPdf, "base64");
  }

  throw new Error("Certificate PDF not found");
}
