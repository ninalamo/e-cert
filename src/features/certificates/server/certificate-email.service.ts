import { CertificateEmailRepository } from "./certificate-email.repository";
import { getEmailProvider } from "@/lib/email";
import { certificateEmailHtml, renderEmailTemplate } from "./email-template";
import { CertificateRepository } from "./certificate.repository";
import { CertificateTemplateRepository } from "@/features/templates/server/template.repository";
import { EventRepository } from "@/features/events/server/event.repository";
import { getCertificatePdfBuffer } from "./certificate.service";
import { ORG_NAME } from "@/lib/org";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/features/audit/server/audit.service";
import type { CertificateEmailLog } from "@/types/certificate-email";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendCertificateEmail(
  certificateId: string,
  userId: string,
  client?: SupabaseClient,
  options?: { skip_pdf?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? (await createClient());
  const certRepo = new CertificateRepository(supabase);
  const emailRepo = new CertificateEmailRepository(supabaseAdmin);
  const eventRepo = new EventRepository(supabase);
  const templateRepo = new CertificateTemplateRepository(supabase);
  const existingLog = await emailRepo.findLatestByCertificateId(certificateId);
  const certificate = await certRepo.findById(certificateId);
  if (!certificate) {
    console.error(`[EmailService] Certificate not found: ${certificateId}`);
    return { success: false, error: "Certificate not found" };
  }

  let orgName = ORG_NAME;
  if (certificate.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", certificate.organization_id)
      .single();
    if (org?.name) orgName = org.name;
  }

  const baseUrl = env.client.NEXT_PUBLIC_BASE_URL;
  const viewUrl = `${baseUrl}/view/${certificate.id}`;
  const verifyUrl = `${baseUrl}/verify?number=${certificate.certificate_number}`;

  const subject = `Your Certificate ${certificate.certificate_number} is Ready`;

  let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;

  if (!options?.skip_pdf) {
    const { data: pdfBuffer, error } = await getCertificatePdfBuffer(certificate);
    if (pdfBuffer && !error) {
      attachments = [
        {
          filename: `${certificate.certificate_number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    } else {
      console.error("[EmailService] Failed to generate PDF:", error);
    }
  }

  // Check if event has a custom email template
  let html: string;
  if (certificate.event_id) {
    const event = await eventRepo.findById(certificate.event_id);
    if (event?.email_template_id) {
      const emailTemplate = await templateRepo.findById(event.email_template_id);
      if (emailTemplate && emailTemplate.type === 'email') {
        html = renderEmailTemplate(emailTemplate.html_content, {
          recipient_name: certificate.recipient_name,
          certificate_number: certificate.certificate_number,
          issued_date: new Date(certificate.issued_at).toLocaleDateString(),
          download_url: viewUrl,
          verify_url: verifyUrl,
          org_name: orgName,
        });
      } else {
        html = certificateEmailHtml({
          recipientName: certificate.recipient_name,
          certificateNumber: certificate.certificate_number,
          issuedDate: new Date(certificate.issued_at).toLocaleDateString(),
          downloadUrl: viewUrl,
          verifyUrl,
          orgName,
        });
      }
    } else {
      html = certificateEmailHtml({
        recipientName: certificate.recipient_name,
        certificateNumber: certificate.certificate_number,
        issuedDate: new Date(certificate.issued_at).toLocaleDateString(),
        downloadUrl: viewUrl,
        verifyUrl,
        orgName,
      });
    }
  } else {
    html = certificateEmailHtml({
      recipientName: certificate.recipient_name,
      certificateNumber: certificate.certificate_number,
      issuedDate: new Date(certificate.issued_at).toLocaleDateString(),
      downloadUrl: viewUrl,
      verifyUrl,
      orgName,
    });
  }

  const emailProvider = getEmailProvider();

  try {
    await emailProvider.sendEmail({
      to: certificate.recipient_email,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    });

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
        await emailRepo.update(existingLog.id, logData);
      } else {
        await emailRepo.create({ certificate_id: certificateId, ...logData });
      }
    } catch (logErr) {
      console.error("[EmailService] Failed to write email log:", logErr);
    }

    await logAudit({
      organization_id: certificate.organization_id,
      user_id: userId,
      action: "email.sent",
      source: "system",
      entity_type: "email",
      entity_id: certificateId,
      details: { sent_to: certificate.recipient_email, subject },
    });

    return { success: true };
  } catch (error) {
    console.error("[EmailService] Failed to send email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

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
        await emailRepo.update(existingLog.id, logData);
      } else {
        await emailRepo.create({ certificate_id: certificateId, ...logData });
      }
    } catch (logErr) {
      console.error("[EmailService] Failed to write email log:", logErr);
    }

    await logAudit({
      organization_id: certificate.organization_id,
      user_id: userId,
      action: "email.failed",
      source: "system",
      entity_type: "email",
      entity_id: certificateId,
      details: { sent_to: certificate.recipient_email, subject, error: errorMessage },
    });

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
