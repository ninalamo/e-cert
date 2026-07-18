"use server";

import * as orgService from "./organization.service";
import { requireSession } from "@/lib/permissions";
import type { UserRole } from "@/types/organization";

export async function createOrganizationAction(_name: string) {
  return { error: "Organization management is disabled in single-org mode" };
}

export async function getMyOrganizationsAction() {
  await requireSession();
  return orgService.getUserOrganizations("");
}

export async function getOrganizationMembersAction(organizationId: string) {
  await requireSession();
  return orgService.getOrganizationMembers(organizationId);
}

export async function addMemberAction(
  organizationId: string,
  email: string,
  role: UserRole
) {
  const session = await requireSession();
  return orgService.addMember(organizationId, email, role, undefined);
}

export async function removeMemberAction(organizationId: string, memberId: string) {
  const session = await requireSession();
  return orgService.removeMember(organizationId, memberId, session.id);
}
