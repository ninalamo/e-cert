import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertificateEmailLog } from "@/types/certificate-email";

export class CertificateEmailRepository extends BaseRepository<CertificateEmailLog> {
  constructor(client: SupabaseClient) {
    super("certificate_emails", client);
  }

  async findByCertificateId(certificateId: string): Promise<CertificateEmailLog[]> {
    return this.findMany(
      { certificate_id: certificateId },
      { orderBy: "sent_at", ascending: false }
    );
  }

  async findLatestByCertificateId(
    certificateId: string
  ): Promise<CertificateEmailLog | null> {
    const logs = await this.findByCertificateId(certificateId);
    return logs[0] ?? null;
  }
}
