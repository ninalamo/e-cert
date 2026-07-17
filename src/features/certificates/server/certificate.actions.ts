"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as certService from "./certificate.service";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function issueCertificateAction(data: {
  organization_id: string;
  template_id: string;
  recipient_name: string;
  recipient_email: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}) {
  await requireAuth();
  return certService.issueCertificate(data);
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
