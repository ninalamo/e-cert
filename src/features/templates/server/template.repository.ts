import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertificateTemplate, AuthProcess } from "@/types/template";

export class CertificateTemplateRepository extends BaseRepository<CertificateTemplate> {
  constructor(client: SupabaseClient) {
    super("certificate_templates", client);
  }

  async findByOrganizationId(
    organizationId: string,
    columns?: string
  ): Promise<CertificateTemplate[]> {
    return this.findMany(
      { organization_id: organizationId },
      {
        orderBy: "created_at",
        ascending: false,
        columns,
      }
    );
  }

  async findByOrganizationIdAndType(
    organizationId: string,
    type: 'certificate' | 'email' | 'auth',
    columns?: string
  ): Promise<CertificateTemplate[]> {
    return this.findMany(
      { organization_id: organizationId, type },
      {
        orderBy: "created_at",
        ascending: false,
        columns,
      }
    );
  }

  async findByOrganizationIdAndName(organizationId: string, name: string): Promise<CertificateTemplate | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("name", name)
      .single();

    if (error) return null;
    return data as CertificateTemplate;
  }

  async findByAuthProcess(authProcess: AuthProcess): Promise<CertificateTemplate | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("type", "auth")
      .eq("auth_process", authProcess)
      .single();

    if (error) return null;
    return data as CertificateTemplate;
  }
}
