import { BaseRepository } from "@/lib/repository/base.repository";
import type { Certificate } from "@/types/certificate";

export class CertificateRepository extends BaseRepository<Certificate> {
  constructor() {
    super("certificates");
  }

  async findByOrganizationId(
    organizationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Certificate[]> {
    return this.findMany(
      { organization_id: organizationId },
      { orderBy: "created_at", ascending: false, ...options }
    );
  }

  async findByCertificateNumber(number: string): Promise<Certificate | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("certificate_number", number)
      .single();

    if (error) return null;
    return data as Certificate;
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    return this.count({ organization_id: organizationId });
  }
}
