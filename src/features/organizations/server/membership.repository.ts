import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserMembership } from "@/types/organization";

export class UserMembershipRepository extends BaseRepository<UserMembership> {
  constructor(client: SupabaseClient) {
    super("user_memberships", client);
  }

  async findByOrganizationId(organizationId: string): Promise<UserMembership[]> {
    return this.findMany({ organization_id: organizationId });
  }

  async findByUserId(userId: string): Promise<UserMembership[]> {
    return this.findMany({ user_id: userId });
  }

  async findMembership(userId: string, organizationId: string): Promise<UserMembership | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .single();

    if (error) return null;
    return data as UserMembership;
  }

  async findByUserEmail(organizationId: string, email: string): Promise<UserMembership | null> {
    const { data: userData, error: userError } = await this.client
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !userData) return null;

    return this.findMembership(userData.id, organizationId);
  }
}
