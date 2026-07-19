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

  async findByRecipientEmail(
    email: string,
    organizationId: string
  ): Promise<Certificate[]> {
    return this.findMany(
      { recipient_email: email, organization_id: organizationId },
      { orderBy: "created_at", ascending: false }
    );
  }

  async findByIdForRecipient(
    id: string,
    email: string
  ): Promise<Certificate | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("id", id)
      .eq("recipient_email", email)
      .single();

    if (error) return null;
    return data as Certificate;
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    return this.count({ organization_id: organizationId });
  }

  async deleteByEventId(eventId: string): Promise<boolean> {
    const { error } = await this.client
      .from(this.table)
      .delete()
      .eq("event_id", eventId);
    return !error;
  }
}
