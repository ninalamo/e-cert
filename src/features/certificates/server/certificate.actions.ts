"use server";

import * as certService from "./certificate.service";
import * as emailService from "./certificate-email.service";
import { env } from "@/lib/env";
import { requireRole, requireSession } from "@/lib/permissions";
import { issueCertificateSchema } from "../schemas/certificate.schema";
import type { Certificate } from "@/types/certificate";

export async function issueCertificateAction(data: {
  organization_id: string;
  template_id?: string;
  recipient_name: string;
  recipient_email: string;
  expires_at?: string;
  file_path?: string;
  metadata?: Record<string, unknown>;
  send_email?: boolean;
}) {
  const session = await requireRole(["admin", "staff"]);
  const parsed = issueCertificateSchema.safeParse(data);
  if (!parsed.success) {
    return { certificate: null, error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }
  return certService.issueCertificate({
    ...parsed.data,
    send_email: parsed.data.send_email ?? false,
    user_id: session.id,
  });
}

export async function uploadCertificateFileAction(
  organizationId: string,
  certificateNumber: string,
  fileBase64: string,
  fileName: string
) {
  await requireRole(["admin", "staff"]);
  const storage = (await import("@/lib/storage")).getStorageProvider();
  const buffer = Buffer.from(fileBase64, "base64");
  const ext = fileName.split(".").pop() || "pdf";
  const filePath = `certificates/${organizationId}/${certificateNumber}.${ext}`;
  await storage.writeFile(filePath, buffer);
  return filePath;
}

export async function getCertificatesAction(organizationId: string) {
  await requireRole(["admin", "staff"]);
  return certService.getCertificates(organizationId);
}

export async function getCertificatesWithEventAction(
  organizationId: string
) {
  await requireRole(["admin", "staff"]);
  return certService.getCertificatesWithEvent(organizationId);
}

export async function getCertificateAction(id: string) {
  const session = await requireRole(["admin", "staff", "participant"]);
  if (session.role === "participant") {
    return certService.getMyCertificate(id, session.email!);
  }
  return certService.getCertificate(id);
}

export async function revokeCertificateAction(id: string, reason: string) {
  const session = await requireRole(["admin"]);
  return certService.revokeCertificate(id, reason, session.id);
}

export async function deleteCertificateAction(id: string) {
  const session = await requireRole(["admin"]);
  return certService.deleteCertificate(id, session.id);
}

export async function sendCertificateEmailAction(certificateId: string) {
  const session = await requireRole(["admin", "staff"]);
  return emailService.sendCertificateEmail(certificateId, session.id);
}

export async function getEmailLogsAction(certificateId: string) {
  await requireRole(["admin", "staff"]);
  return emailService.getEmailLogs(certificateId);
}

export async function getMyCertificatesAction(): Promise<Array<Certificate & { events: { name: string } | null }>> {
  const session = await requireSession();
  return certService.getMyCertificatesWithEvent(
    session.email!,
    "id, certificate_number, issued_at, expires_at, revoked_at"
  );
}

export async function getMyCertificateAction(id: string) {
  const session = await requireSession();
  return certService.getMyCertificate(id, session.email!);
}

export async function getCertificateQrCodeAction(certificateNumber: string) {
  await requireRole(["admin", "staff", "participant"]);
  const { generateQrCodeDataUrl } = await import("@/lib/qr");
  const baseUrl = env.client.NEXT_PUBLIC_BASE_URL;
  const verifyUrl = `${baseUrl}/verify?number=${encodeURIComponent(certificateNumber)}`;
  return generateQrCodeDataUrl(verifyUrl, { width: 200, margin: 2 });
}

export async function getSessionRoleAction() {
  const session = await requireSession();
  return session.role;
}

export async function getAllEmailLogsAction(limit = 50, offset = 0) {
  await requireRole(["admin"]);
  const emailRepo = new (await import("./certificate-email.repository")).CertificateEmailRepository(
    (await import("@/lib/supabase/admin")).supabaseAdmin
  );
  return emailRepo.findAll({ limit, offset });
}
