import { supabaseAdmin } from "@/lib/supabase/admin";

export interface DashboardStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  totalEmails: number;
}

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const [total, revoked, emails] = await Promise.all([
    supabaseAdmin
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .not("revoked_at", "is", null),
    supabaseAdmin
      .from("certificate_emails")
      .select("*", { count: "exact", head: true })
      .in(
        "certificate_id",
        (
          await supabaseAdmin
            .from("certificates")
            .select("id")
            .eq("organization_id", organizationId)
        ).data?.map((c) => c.id) ?? []
      ),
  ]);

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
  limit = 5
): Promise<RecentActivity[]> {
  const certs = await supabaseAdmin
    .from("certificates")
    .select("certificate_number, recipient_name, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const emails = await supabaseAdmin
    .from("certificate_emails")
    .select("sent_to, subject, sent_at, certificate_id")
    .in(
      "certificate_id",
      (
        await supabaseAdmin
          .from("certificates")
          .select("id")
          .eq("organization_id", organizationId)
      ).data?.map((c) => c.id) ?? []
    )
    .order("sent_at", { ascending: false })
    .limit(limit);

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
