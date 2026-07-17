import { CertificateRepository } from "./certificate.repository";
import { generateCertificateNumber } from "./certificate-number";
import type { Certificate } from "@/types/certificate";
import type { CertificateTemplate } from "@/types/template";
import { renderHtmlToPdf } from "@/lib/pdf";
import { getStorageProvider } from "@/lib/storage";
import { generateQrCode } from "@/lib/qr";

const certRepo = new CertificateRepository();

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
  file_path?: string;
  metadata?: Record<string, unknown>;
  send_email?: boolean;
  user_id?: string;
}): Promise<{ certificate: Certificate | null; error?: string; emailSent?: boolean }> {
  const number = await generateCertificateNumber(data.organization_id);

  const certificate = await certRepo.create({
    organization_id: data.organization_id,
    event_id: data.event_id ?? null,
    template_id: data.template_id ?? null,
    recipient_name: data.recipient_name,
    recipient_email: data.recipient_email,
    certificate_number: number,
    expires_at: data.expires_at ?? null,
    file_path: data.file_path ?? null,
    metadata: data.metadata ?? null,
  } as Partial<Certificate>);

  if (!certificate) {
    return { certificate: null, error: "Failed to issue certificate" };
  }

  if (data.send_email && data.user_id) {
    const { sendCertificateEmail } = await import("./certificate-email.service");
    const emailResult = await sendCertificateEmail(certificate.id, data.user_id);
    return { certificate, emailSent: emailResult.success, error: emailResult.error };
  }

  return { certificate };
}

export async function getCertificates(organizationId: string): Promise<Certificate[]> {
  return certRepo.findByOrganizationId(organizationId);
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  return certRepo.findById(id);
}

export async function getCertificateByNumber(number: string): Promise<Certificate | null> {
  return certRepo.findByCertificateNumber(number);
}

export async function revokeCertificate(
  id: string,
  reason: string
): Promise<{ certificate: Certificate | null; error?: string }> {
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
    const storage = getStorageProvider();
    return storage.readFile(certificate.file_path);
  }

  const { getTemplate } = await import("@/features/templates/server/template.service");
  const template = await getTemplate(certificate.template_id!);
  if (!template) {
    throw new Error("Template not found");
  }

  return generateCertificatePdf(certificate, template);
}

export async function generateCertificatePdf(
  certificate: Certificate,
  template: CertificateTemplate
): Promise<Buffer> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?number=${certificate.certificate_number}`;

  const qrBuffer = await generateQrCode(verifyUrl, { width: 128, margin: 1 });
  const qrDataUrl = `data:image/png;base64,${qrBuffer.toString("base64")}`;

  const html = renderTemplate(template.html_content, template.css_content ?? "", {
    recipient_name: certificate.recipient_name,
    certificate_number: certificate.certificate_number,
    issued_date: new Date(certificate.issued_at).toLocaleDateString(),
    organization_name: "Organization",
    qr_code: `<img src="${qrDataUrl}" width="128" height="128" />`,
  });

  return renderHtmlToPdf(html, {
    format: "A4",
    landscape: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
}
