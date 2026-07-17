import { CertificateEmailRepository } from "./certificate-email.repository";
import { getEmailProvider } from "@/lib/email";
import { certificateEmailHtml } from "./email-template";
import { CertificateRepository } from "./certificate.repository";
import { getCertificatePdfBuffer } from "./certificate.service";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import type { CertificateEmailLog } from "@/types/certificate-email";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendCertificateEmail(
  certificateId: string,
  userId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? (await createClient());
  const certRepo = new CertificateRepository(supabase);
  const emailRepo = new CertificateEmailRepository(supabase);
  const certificate = await certRepo.findById(certificateId);
  if (!certificate) {
    return { success: false, error: "Certificate not found" };
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await getCertificatePdfBuffer(certificate);
  } catch (err) {
    console.error("[EmailService] Failed to generate PDF:", err);
    return { success: false, error: `Failed to generate PDF: ${err instanceof Error ? err.message : "Unknown"}` };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const downloadUrl = `${baseUrl}/api/certificates/${certificate.id}/download`;
  const verifyUrl = `${baseUrl}/login?number=${certificate.certificate_number}`;

  let qrCodeDataUrl: string | undefined;
  try {
    qrCodeDataUrl = await generateQrCodeDataUrl(verifyUrl, { width: 128, margin: 1 });
  } catch {
    // QR code is optional
  }

  const subject = `Your Certificate ${certificate.certificate_number} is Ready`;
  const html = certificateEmailHtml({
    recipientName: certificate.recipient_name,
    certificateNumber: certificate.certificate_number,
    issuedDate: new Date(certificate.issued_at).toLocaleDateString(),
    downloadUrl,
    verifyUrl,
    qrCodeDataUrl,
  });

  const emailProvider = getEmailProvider();

  try {
    await emailProvider.sendEmail({
      to: certificate.recipient_email,
      subject,
      html,
      attachments: [
        {
          filename: `${certificate.certificate_number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    await emailRepo.create({
      certificate_id: certificateId,
      sent_to: certificate.recipient_email,
      subject,
      sent_by: userId,
      status: "sent",
    } as Partial<CertificateEmailLog>);

    return { success: true };
  } catch (error) {
    console.error("[EmailService] Failed to send email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await emailRepo.create({
      certificate_id: certificateId,
      sent_to: certificate.recipient_email,
      subject,
      sent_by: userId,
      status: "failed",
      error_message: errorMessage,
    } as Partial<CertificateEmailLog>);

    return { success: false, error: errorMessage };
  }
}

export async function getEmailLogs(
  certificateId: string,
  client?: SupabaseClient
): Promise<CertificateEmailLog[]> {
  const emailRepo = new CertificateEmailRepository(client ?? (await createClient()));
  return emailRepo.findByCertificateId(certificateId);
}
