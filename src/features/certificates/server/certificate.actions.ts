"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as certService from "./certificate.service";
import * as emailService from "./certificate-email.service";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

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
  const user = await requireAuth();
  return certService.issueCertificate({
    ...data,
    send_email: data.send_email ?? false,
    user_id: user.id,
  });
}

export async function uploadCertificateFileAction(
  organizationId: string,
  certificateNumber: string,
  fileBase64: string,
  fileName: string
) {
  await requireAuth();
  const storage = (await import("@/lib/storage")).getStorageProvider();
  const buffer = Buffer.from(fileBase64, "base64");
  const ext = fileName.split(".").pop() || "pdf";
  const filePath = `certificates/${organizationId}/${certificateNumber}.${ext}`;
  await storage.writeFile(filePath, buffer);
  return filePath;
}

export async function getCertificatesAction(organizationId: string) {
  await requireAuth();
  return certService.getCertificates(organizationId);
}

export async function getCertificateAction(id: string) {
  await requireAuth();
  return certService.getCertificate(id);
}

export async function revokeCertificateAction(id: string, reason: string) {
  await requireAuth();
  return certService.revokeCertificate(id, reason);
}

export async function sendCertificateEmailAction(certificateId: string) {
  const user = await requireAuth();
  return emailService.sendCertificateEmail(certificateId, user.id);
}

export async function getEmailLogsAction(certificateId: string) {
  await requireAuth();
  return emailService.getEmailLogs(certificateId);
}
