import { supabaseAdmin } from "@/lib/supabase/admin";
import { ORG_ID } from "@/lib/org";
import type { UserRole } from "@/types/organization";

export interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: UserRole | null;
  is_attendee: boolean;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, email, name, created_at, banned_until");
  if (error || !users) return [];

  const userIds = users.map((u) => u.id);

  const { data: memberships } = await supabaseAdmin
    .from("user_memberships")
    .select("user_id, role")
    .eq("organization_id", ORG_ID)
    .in("user_id", userIds);

  const roleMap = new Map<string, UserRole>();
  for (const m of memberships ?? []) {
    roleMap.set(m.user_id, m.role as UserRole);
  }

  const emails = users.map((u) => u.email);

  const { data: attendees } = await supabaseAdmin
    .from("event_attendees")
    .select("email")
    .eq("organization_id", ORG_ID)
    .in("email", emails);

  const attendeeEmails = new Set((attendees ?? []).map((a) => a.email));

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    created_at: u.created_at,
    last_sign_in_at: null,
    banned_until: u.banned_until,
    role: roleMap.get(u.id) ?? null,
    is_attendee: attendeeEmails.has(u.email),
  }));
}

export async function setUserRole(
  userId: string,
  role: UserRole
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("user_memberships")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("organization_id", ORG_ID);
  if (error) return { error: error.message };
  return {};
}

export async function banUser(
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ banned_until: "infinity" })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function unbanUser(
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ banned_until: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteUser(
  userId: string
): Promise<{ error?: string }> {
  await supabaseAdmin
    .from("user_memberships")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", ORG_ID);

  const { error } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}
