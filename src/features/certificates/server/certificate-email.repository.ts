import { BaseRepository } from "@/lib/repository/base.repository";
import type { CertificateEmailLog } from "@/types/certificate-email";

export class CertificateEmailRepository extends BaseRepository<CertificateEmailLog> {
  constructor() {
    super("certificate_emails");
  }

  async findByCertificateId(certificateId: string): Promise<CertificateEmailLog[]> {
    return this.findMany(
      { certificate_id: certificateId },
      { orderBy: "sent_at", ascending: false }
    );
  }
}
