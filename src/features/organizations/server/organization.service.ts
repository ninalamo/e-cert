import { OrganizationRepository } from "./organization.repository";
import { UserMembershipRepository } from "./membership.repository";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/types/organization";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/organization";

function repos(client: SupabaseClient) {
  return {
    orgRepo: new OrganizationRepository(client),
    membershipRepo: new UserMembershipRepository(client),
  };
}

/**
 * In the single-org model there is one fixed organization (ORG_ID).
 * "Creating" an org is disabled; users are added as members of ORG_ID instead.
 * Kept for compatibility but returns an error if called.
 */
export async function createOrganization(): Promise<{
  org: Organization | null;
  error?: string;
}> {
  return { org: null, error: "Organization management is disabled in single-org mode" };
}

export async function getUserOrganizations(
  userId: string,
  client?: SupabaseClient
): Promise<Organization[]> {
  return repos(client ?? (await createClient())).orgRepo.findByUserId(userId);
}

export async function getOrganizationMembers(
  organizationId: string,
  client?: SupabaseClient
) {
  return repos(client ?? (await createClient())).membershipRepo.findByOrganizationId(organizationId);
}

export async function addMember(
  organizationId: string,
  email: string,
  role: UserRole,
  client?: SupabaseClient
): Promise<{ error?: string }> {
  const supabase = client ?? (await createClient());
  const { membershipRepo } = repos(supabase);

  const { data: targetUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !targetUser) {
    return { error: "No user found with this email. They must register first." };
  }

  const existing = await membershipRepo.findMembership(targetUser.id, organizationId);
  if (existing) {
    return { error: "User is already a member of this organization" };
  }

  const { data: membership, error: createError } = await membershipRepo.create({
    user_id: targetUser.id,
    organization_id: organizationId,
    role,
  } as Record<string, unknown>);

  if (!membership) {
    return { error: createError ?? "Failed to add member" };
  }

  return {};
}

export async function removeMember(
  organizationId: string,
  memberId: string,
  removedBy: string,
  client?: SupabaseClient
): Promise<{ error?: string }> {
  const supabase = client ?? (await createClient());
  const { membershipRepo } = repos(supabase);

  const removerMembership = await membershipRepo.findMembership(removedBy, organizationId);
  if (!removerMembership || removerMembership.role !== "admin") {
    return { error: "Only admins can remove members" };
  }

  if (memberId === removedBy) {
    return { error: "You cannot remove yourself from the organization" };
  }

  const targetMembership = await membershipRepo.findMembership(memberId, organizationId);
  if (!targetMembership) {
    return { error: "Member not found" };
  }

  if (targetMembership.role === "admin") {
    return { error: "Cannot remove another admin" };
  }

  const deleted = await membershipRepo.delete(targetMembership.id);
  if (!deleted) {
    return { error: "Failed to remove member" };
  }

  return {};
}
