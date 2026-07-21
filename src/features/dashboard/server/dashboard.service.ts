import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  totalEmails: number;
}

export async function getDashboardStats(
  organizationId: string,
  client?: SupabaseClient
): Promise<DashboardStats> {
  const supabase = client ?? (await createClient());

  const [total, revoked, certIds] = await Promise.all([
    supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .not("revoked_at", "is", null),
    supabase
      .from("certificates")
      .select("id")
      .eq("organization_id", organizationId),
  ]);

  const ids = certIds.data?.map((c) => c.id) ?? [];

  const emails = ids.length > 0
    ? await supabase
        .from("certificate_emails")
        .select("id", { count: "exact", head: true })
        .in("certificate_id", ids)
    : { count: 0 };

  const totalCerts = total.count ?? 0;
  const revokedCerts = revoked.count ?? 0;

  return {
    totalCertificates: totalCerts,
    activeCertificates: totalCerts - revokedCerts,
    revokedCertificates: revokedCerts,
    totalEmails: emails.count ?? 0,
  };
}

export interface RecentActivity {
  type: "certificate_issued" | "email_sent";
  certificate_number: string;
  recipient_name: string;
  timestamp: string;
}

export async function getRecentActivity(
  organizationId: string,
  limit = 5,
  client?: SupabaseClient
): Promise<RecentActivity[]> {
  const supabase = client ?? (await createClient());

  const [certs, certIds] = await Promise.all([
    supabase
      .from("certificates")
      .select("certificate_number, recipient_name, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("certificates")
      .select("id")
      .eq("organization_id", organizationId),
  ]);

  const ids = certIds.data?.map((c) => c.id) ?? [];

  const emails = ids.length > 0
    ? await supabase
        .from("certificate_emails")
        .select("sent_to, subject, sent_at, certificate_id")
        .in("certificate_id", ids)
        .order("sent_at", { ascending: false })
        .limit(limit)
    : { data: [] };

  const activities: RecentActivity[] = [];

  for (const cert of certs.data ?? []) {
    activities.push({
      type: "certificate_issued",
      certificate_number: cert.certificate_number,
      recipient_name: cert.recipient_name,
      timestamp: cert.created_at,
    });
  }

  for (const email of emails.data ?? []) {
    activities.push({
      type: "email_sent",
      certificate_number: email.subject,
      recipient_name: email.sent_to,
      timestamp: email.sent_at,
    });
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, limit);
}
