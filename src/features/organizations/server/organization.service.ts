import { OrganizationRepository } from "./organization.repository";
import { UserMembershipRepository } from "./membership.repository";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Organization } from "@/types/organization";

const orgRepo = new OrganizationRepository();
const membershipRepo = new UserMembershipRepository();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createOrganization(
  name: string,
  ownerId: string
): Promise<{ org: Organization | null; error?: string }> {
  const slug = slugify(name);

  const existing = await orgRepo.findBySlug(slug);
  if (existing) {
    return { org: null, error: "An organization with this name already exists" };
  }

  const org = await orgRepo.create({ name, slug } as Partial<Organization>);
  if (!org) {
    return { org: null, error: "Failed to create organization" };
  }

  const membership = await membershipRepo.create({
    user_id: ownerId,
    organization_id: org.id,
    role: "OWNER",
  } as Record<string, unknown>);

  if (!membership) {
    return { org: null, error: "Failed to add you as owner" };
  }

  return { org };
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  return orgRepo.findByUserId(userId);
}

export async function getOrganizationMembers(organizationId: string) {
  return membershipRepo.findByOrganizationId(organizationId);
}

export async function inviteMember(
  organizationId: string,
  email: string,
  invitedBy: string
): Promise<{ error?: string }> {
  const inviterMembership = await membershipRepo.findMembership(invitedBy, organizationId);
  if (!inviterMembership || inviterMembership.role === "MEMBER") {
    return { error: "You don't have permission to invite members" };
  }

  const existing = await membershipRepo.findByUserEmail(organizationId, email);
  if (existing) {
    return { error: "User is already a member of this organization" };
  }

  const { data: targetUser, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !targetUser) {
    return { error: "No user found with this email. They must register first." };
  }

  const membership = await membershipRepo.create({
    user_id: targetUser.id,
    organization_id: organizationId,
    role: "MEMBER",
  } as Record<string, unknown>);

  if (!membership) {
    return { error: "Failed to add member" };
  }

  return {};
}

export async function removeMember(
  organizationId: string,
  memberId: string,
  removedBy: string
): Promise<{ error?: string }> {
  const removerMembership = await membershipRepo.findMembership(removedBy, organizationId);
  if (!removerMembership || removerMembership.role === "MEMBER") {
    return { error: "You don't have permission to remove members" };
  }

  if (memberId === removedBy) {
    return { error: "You cannot remove yourself from the organization" };
  }

  const targetMembership = await membershipRepo.findMembership(memberId, organizationId);
  if (!targetMembership) {
    return { error: "Member not found" };
  }

  if (targetMembership.role === "OWNER") {
    return { error: "Cannot remove the organization owner" };
  }

  const deleted = await membershipRepo.delete(targetMembership.id);
  if (!deleted) {
    return { error: "Failed to remove member" };
  }

  return {};
}
