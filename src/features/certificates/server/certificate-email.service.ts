import { CertificateEmailRepository } from "./certificate-email.repository";
import { getEmailProvider } from "@/lib/email";
import { certificateEmailHtml } from "./email-template";
import { CertificateRepository } from "./certificate.repository";
import { getCertificatePdfBuffer } from "./certificate.service";
import { ORG_NAME } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CertificateEmailLog } from "@/types/certificate-email";
import type { SupabaseClient } from "@supabase/supabase-js";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

function debug(...args: unknown[]) {
  if (isLocalhost) console.log("[EmailService:dev]", ...args);
}

export async function sendCertificateEmail(
  certificateId: string,
  userId: string,
  client?: SupabaseClient,
  options?: { skip_pdf?: boolean }
): Promise<{ success: boolean; error?: string }> {
  console.log(`[EmailService] sendCertificateEmail called: certId=${certificateId}, userId=${userId}, skip_pdf=${options?.skip_pdf}`);
  const supabase = client ?? (await createClient());
  const certRepo = new CertificateRepository(supabase);
  const emailRepo = new CertificateEmailRepository(supabaseAdmin);
  const existingLog = await emailRepo.findLatestByCertificateId(certificateId);
  const certificate = await certRepo.findById(certificateId);
  if (!certificate) {
    console.error(`[EmailService] Certificate not found: ${certificateId}`);
    return { success: false, error: "Certificate not found" };
  }
  console.log(`[EmailService] Certificate found: recipient=${certificate.recipient_email}, number=${certificate.certificate_number}`);

  let orgName = ORG_NAME;
  if (certificate.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", certificate.organization_id)
      .single();
    if (org?.name) orgName = org.name;
  }

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
    orgName,
  });

  const emailProvider = getEmailProvider();

  console.log(`[EmailService] Sending email to ${certificate.recipient_email}, subject: "${subject}"`);
  console.log(`[EmailService] viewUrl=${viewUrl}, downloadUrl=${downloadUrl}`);

  try {
    debug("Calling emailProvider.sendEmail", {
      to: certificate.recipient_email,
      subject,
      hasAttachments: !!attachments,
      provider: emailProvider.constructor?.name,
    });
    await emailProvider.sendEmail({
      to: certificate.recipient_email,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    });
    console.log(`[EmailService] Email sent successfully to ${certificate.recipient_email}`);

    const logData = {
      sent_to: certificate.recipient_email,
      subject,
      sent_by: userId,
      status: "sent",
      error_message: null,
      sent_at: new Date().toISOString(),
    } as Partial<CertificateEmailLog>;

    try {
      if (existingLog) {
        debug("Updating existing email log", existingLog.id, logData);
        await emailRepo.update(existingLog.id, logData);
      } else {
        debug("Creating new email log", { certificate_id: certificateId, ...logData });
        await emailRepo.create({ certificate_id: certificateId, ...logData });
      }
      debug("Email log write succeeded");
    } catch (logErr) {
      debug("Email log write FAILED:", logErr);
      console.error("[EmailService] Failed to write email log:", logErr);
    }

    return { success: true };
  } catch (error) {
    console.error("[EmailService] Failed to send email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    debug("Email send error detail:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      raw: error,
    });

    const logData = {
      sent_to: certificate.recipient_email,
      subject,
      sent_by: userId,
      status: "failed",
      error_message: errorMessage,
      sent_at: new Date().toISOString(),
    } as Partial<CertificateEmailLog>;

    try {
      if (existingLog) {
        debug("Updating existing email log (failed)", existingLog.id, logData);
        await emailRepo.update(existingLog.id, logData);
      } else {
        debug("Creating new email log (failed)", { certificate_id: certificateId, ...logData });
        await emailRepo.create({ certificate_id: certificateId, ...logData });
      }
      debug("Email log write (failed) succeeded");
    } catch (logErr) {
      debug("Email log write (failed) FAILED:", logErr);
      console.error("[EmailService] Failed to write email log:", logErr);
    }

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
