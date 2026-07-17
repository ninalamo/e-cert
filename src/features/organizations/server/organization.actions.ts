"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as orgService from "./organization.service";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function createOrganizationAction(name: string) {
  const user = await requireAuth();
  const result = await orgService.createOrganization(name, user.id);
  if (result.error) return { error: result.error };
  redirect("/dashboard");
}

export async function getMyOrganizationsAction() {
  const user = await requireAuth();
  return orgService.getUserOrganizations(user.id);
}

export async function getOrganizationMembersAction(organizationId: string) {
  await requireAuth();
  return orgService.getOrganizationMembers(organizationId);
}

export async function inviteMemberAction(organizationId: string, email: string) {
  const user = await requireAuth();
  return orgService.inviteMember(organizationId, email, user.id);
}

export async function removeMemberAction(organizationId: string, memberId: string) {
  const user = await requireAuth();
  return orgService.removeMember(organizationId, memberId, user.id);
}
