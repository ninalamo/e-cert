import { CertificateEmailRepository } from "./certificate-email.repository";
import { getEmailProvider } from "@/lib/email";
import { certificateEmailHtml, renderEmailTemplate } from "./email-template";
import { CertificateRepository } from "./certificate.repository";
import { CertificateTemplateRepository } from "@/features/templates/server/template.repository";
import { EventRepository } from "@/features/events/server/event.repository";
import { getCertificatePdfBuffer } from "./certificate.service";
import { ORG_NAME } from "@/lib/org";
import { env } from "@/lib/env";
import { logAudit } from "@/features/audit/server/audit.service";
import type { CertificateEmailLog } from "@/types/certificate-email";
import type { Certificate } from "@/types/certificate";
import type { Event } from "@/types/event";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getDefaultClient(): Promise<SupabaseClient> {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

async function getAdminClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

export async function sendCertificateEmail(
  certificateId: string,
  userId: string,
  client?: SupabaseClient,
  options?: {
    skip_pdf?: boolean;
    certificate?: Certificate;
    event?: Event;
    orgName?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? await getDefaultClient();
  const certRepo = new CertificateRepository(supabase);
  const emailRepo = new CertificateEmailRepository(await getAdminClient());
  const eventRepo = new EventRepository(supabase);
  const templateRepo = new CertificateTemplateRepository(supabase);
  const existingLog = await emailRepo.findLatestByCertificateId(certificateId);
  const certificate = options?.certificate ?? await certRepo.findById(certificateId);
  if (!certificate) {
    console.error(`[EmailService] Certificate not found: ${certificateId}`);
    return { success: false, error: "Certificate not found" };
  }

  let orgName = options?.orgName ?? ORG_NAME;
  if (!options?.orgName && certificate.organization_id) {
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

  let eventName = "Certificate";
  const event = options?.event ?? (certificate.event_id ? await eventRepo.findById(certificate.event_id) : null);
  if (event?.name) eventName = event.name;
  const subject = `Your ${eventName} Certificate is Ready`;

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
  if (certificate.event_id && event?.email_template_id) {
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

    logAudit({
      organization_id: certificate.organization_id,
      user_id: userId,
      action: "email.sent",
      source: "system",
      entity_type: "email",
      entity_id: certificateId,
      details: { sent_to: certificate.recipient_email, subject },
    }).catch(console.error);

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

    logAudit({
      organization_id: certificate.organization_id,
      user_id: userId,
      action: "email.failed",
      source: "system",
      entity_type: "email",
      entity_id: certificateId,
      details: { sent_to: certificate.recipient_email, subject, error: errorMessage },
    }).catch(console.error);

    return { success: false, error: errorMessage };
  }
}

export async function getEmailLogs(
  certificateId: string,
  client?: SupabaseClient
): Promise<CertificateEmailLog[]> {
  const emailRepo = new CertificateEmailRepository(client ?? await getDefaultClient());
  return emailRepo.findByCertificateId(certificateId);
}

export async function sendExpiryNotification(
  certificates: Certificate[],
  userId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  if (certificates.length === 0) return { success: true };

  const supabase = client ?? await getDefaultClient();
  const orgId = certificates[0].organization_id;
  if (!orgId) return { success: false, error: "Missing organization_id" };

  const { data: users } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("organization_id", orgId)
    .in("role", ["admin", "staff"]);

  if (!users || users.length === 0) return { success: false, error: "No admin users found" };

  const certList = certificates
    .map((c) => `- ${c.certificate_number}: ${c.recipient_name} (${c.recipient_email}) — expires ${c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "unknown"}`)
    .join("\n");

  const subject = `Expiring Certificates Notification — ${certificates.length} certificate(s) expiring within 30 days`;
  const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:24px;border:1px solid #d4d4d8;background:#fff;"><h2 style="color:#18181b;">Certificate Expiry Notice</h2><p>The following certificates will expire within 30 days:</p><pre style="background:#fafafa;padding:16px;border-radius:4px;font-size:14px;white-space:pre-wrap;">${certList}</pre><p style="color:#71717a;font-size:13px;">Please take appropriate action for each certificate.</p></div>`;

  const emailProvider = getEmailProvider();
  const adminEmails = users.map((u) => u.email!);

  try {
    await emailProvider.sendEmail({
      to: adminEmails.join(","),
      subject,
      html,
    });

    const emailRepo = new CertificateEmailRepository(supabase);
    await emailRepo.create({
      certificate_id: certificates[0].id,
      sent_to: adminEmails.join(","),
      subject,
      sent_by: userId,
      status: "sent",
      error_message: null,
      sent_at: new Date().toISOString(),
    } as Partial<CertificateEmailLog>);

    return { success: true };
  } catch (error) {
    console.error("[EmailService] Failed to send expiry notification:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
