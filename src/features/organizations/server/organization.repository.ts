import { BaseRepository } from "@/lib/repository/base.repository";
import type { Organization } from "@/types/organization";

export class OrganizationRepository extends BaseRepository<Organization> {
  constructor() {
    super("organizations");
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) return null;
    return data as Organization;
  }

  async findByUserId(userId: string): Promise<Organization[]> {
    const { data, error } = await this.client
      .from("user_memberships")
      .select("organizations(*)")
      .eq("user_id", userId);

    if (error) return [];
    return (data ?? []).map(
      (m: Record<string, unknown>) => m.organizations as Organization
    );
  }
}
