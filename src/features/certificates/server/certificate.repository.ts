import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Certificate } from "@/types/certificate";

export class CertificateRepository extends BaseRepository<Certificate> {
  constructor(client: SupabaseClient) {
    super("certificates", client);
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

  async findByEventId(eventId: string): Promise<Certificate[]> {
    return this.findMany(
      { event_id: eventId },
      { orderBy: "created_at", ascending: false }
    );
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    return this.count({ organization_id: organizationId });
  }
}
