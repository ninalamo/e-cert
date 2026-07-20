import { CertificateEmailRepository } from "./certificate-email.repository";
import { getEmailProvider } from "@/lib/email";
import { certificateEmailHtml } from "./email-template";
import { CertificateRepository } from "./certificate.repository";
import { getCertificatePdfBuffer } from "./certificate.service";
import { ORG_NAME } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { CertificateEmailLog } from "@/types/certificate-email";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendCertificateEmail(
  certificateId: string,
  userId: string,
  client?: SupabaseClient,
  options?: { skip_pdf?: boolean }
): Promise<{ success: boolean; error?: string }> {
  console.log(`[EmailService] sendCertificateEmail called: certId=${certificateId}, userId=${userId}, skip_pdf=${options?.skip_pdf}`);
  const supabase = client ?? (await createClient());
  const certRepo = new CertificateRepository(supabase);
  const emailRepo = new CertificateEmailRepository(supabase);
  const certificate = await certRepo.findById(certificateId);
  if (!certificate) {
    console.error(`[EmailService] Certificate not found: ${certificateId}`);
    return { success: false, error: "Certificate not found" };
  }
  console.log(`[EmailService] Certificate found: recipient=${certificate.recipient_email}, number=${certificate.certificate_number}`);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const downloadUrl = `${baseUrl}/api/certificates/${certificate.id}/download`;
  const viewUrl = options?.skip_pdf ? `${baseUrl}/my/certificates/${certificate.id}` : downloadUrl;
  const verifyUrl = `${baseUrl}/verify?number=${certificate.certificate_number}`;

  const subject = `Your Certificate ${certificate.certificate_number} is Ready`;

  let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;

  if (!options?.skip_pdf) {
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await getCertificatePdfBuffer(certificate);
      attachments = [
        {
          filename: `${certificate.certificate_number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    } catch (err) {
      console.error("[EmailService] Failed to generate PDF:", err);
    }
  }

  const html = certificateEmailHtml({
    recipientName: certificate.recipient_name,
    certificateNumber: certificate.certificate_number,
    issuedDate: new Date(certificate.issued_at).toLocaleDateString(),
    downloadUrl: options?.skip_pdf ? viewUrl : downloadUrl,
    verifyUrl,
    orgName: ORG_NAME,
  });

  const emailProvider = getEmailProvider();

  console.log(`[EmailService] Sending email to ${certificate.recipient_email}, subject: "${subject}"`);
  console.log(`[EmailService] viewUrl=${viewUrl}, downloadUrl=${downloadUrl}`);

  try {
    await emailProvider.sendEmail({
      to: certificate.recipient_email,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    });
    console.log(`[EmailService] Email sent successfully to ${certificate.recipient_email}`);

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
