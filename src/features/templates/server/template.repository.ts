import { BaseRepository } from "@/lib/repository/base.repository";
import type { CertificateTemplate } from "@/types/template";

export class CertificateTemplateRepository extends BaseRepository<CertificateTemplate> {
  constructor() {
    super("certificate_templates");
  }

  async findByOrganizationId(organizationId: string): Promise<CertificateTemplate[]> {
    return this.findMany(
      { organization_id: organizationId },
      { orderBy: "created_at", ascending: false }
    );
  }
}
