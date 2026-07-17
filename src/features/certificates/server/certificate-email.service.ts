import { CertificateEmailRepository } from "./certificate-email.repository";
import { getEmailProvider } from "@/lib/email";
import { certificateEmailHtml } from "./email-template";
import { CertificateRepository } from "./certificate.repository";
import { getCertificatePdfBuffer } from "./certificate.service";
import { generateQrCodeDataUrl } from "@/lib/qr";
import type { CertificateEmailLog } from "@/types/certificate-email";

const emailRepo = new CertificateEmailRepository();
const certRepo = new CertificateRepository();

export async function sendCertificateEmail(
  certificateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const certificate = await certRepo.findById(certificateId);
  if (!certificate) {
    return { success: false, error: "Certificate not found" };
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await getCertificatePdfBuffer(certificate);
  } catch {
    return { success: false, error: "Failed to generate PDF" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const downloadUrl = `${baseUrl}/api/certificates/${certificate.id}/download`;
  const verifyUrl = `${baseUrl}/verify?number=${certificate.certificate_number}`;

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await emailRepo.create({
      certificate_id: certificateId,
      sent_to: certificate.recipient_email,
      subject,
      sent_by: userId,
      status: "failed",
      error_message: errorMessage,
    } as Partial<CertificateEmailLog>);

    return { success: false, error: "Failed to send email" };
  }
}

export async function getEmailLogs(certificateId: string): Promise<CertificateEmailLog[]> {
  return emailRepo.findByCertificateId(certificateId);
}
