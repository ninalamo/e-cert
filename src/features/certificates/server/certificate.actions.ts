"use server";

import * as certService from "./certificate.service";
import * as emailService from "./certificate-email.service";
import { requireSession } from "@/lib/permissions";

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
  const session = await requireSession();
  return certService.issueCertificate({
    ...data,
    send_email: data.send_email ?? false,
    user_id: session.id,
  });
}

export async function uploadCertificateFileAction(
  organizationId: string,
  certificateNumber: string,
  fileBase64: string,
  fileName: string
) {
  await requireSession();
  const storage = (await import("@/lib/storage")).getStorageProvider();
  const buffer = Buffer.from(fileBase64, "base64");
  const ext = fileName.split(".").pop() || "pdf";
  const filePath = `certificates/${organizationId}/${certificateNumber}.${ext}`;
  await storage.writeFile(filePath, buffer);
  return filePath;
}

export async function getCertificatesAction(organizationId: string) {
  await requireSession();
  return certService.getCertificates(organizationId);
}

export async function getCertificateAction(id: string) {
  await requireSession();
  return certService.getCertificate(id);
}

export async function revokeCertificateAction(id: string, reason: string) {
  await requireSession();
  return certService.revokeCertificate(id, reason);
}

export async function sendCertificateEmailAction(certificateId: string) {
  const session = await requireSession();
  return emailService.sendCertificateEmail(certificateId, session.id);
}

export async function getEmailLogsAction(certificateId: string) {
  await requireSession();
  return emailService.getEmailLogs(certificateId);
}

export async function getMyCertificatesAction() {
  const session = await requireSession();
  return certService.getMyCertificates(session.email!);
}

export async function getMyCertificateAction(id: string) {
  const session = await requireSession();
  return certService.getMyCertificate(id, session.email!);
}
