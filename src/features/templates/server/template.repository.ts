import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertificateTemplate } from "@/types/template";

export class CertificateTemplateRepository extends BaseRepository<CertificateTemplate> {
  constructor(client: SupabaseClient) {
    super("certificate_templates", client);
  }

  async findByOrganizationId(organizationId: string): Promise<CertificateTemplate[]> {
    return this.findMany(
      { organization_id: organizationId },
      { orderBy: "created_at", ascending: false }
    );
  }
}
