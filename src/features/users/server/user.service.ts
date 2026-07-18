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
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error || !data?.users) return [];

  const userIds = data.users.map((u) => u.id);

  const { data: memberships } = await supabaseAdmin
    .from("user_memberships")
    .select("user_id, role")
    .eq("organization_id", ORG_ID)
    .in("user_id", userIds);

  const roleMap = new Map<string, UserRole>();
  for (const m of memberships ?? []) {
    roleMap.set(m.user_id, m.role as UserRole);
  }

  const emails = data.users.map((u) => u.email!);

  const { data: attendees } = await supabaseAdmin
    .from("event_attendees")
    .select("email")
    .eq("organization_id", ORG_ID)
    .in("email", emails);

  const attendeeEmails = new Set((attendees ?? []).map((a) => a.email));

  return data.users.map((u) => ({
    id: u.id,
    email: u.email!,
    name: (u.user_metadata?.name as string | undefined) ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    banned_until: u.banned_until ?? null,
    role: roleMap.get(u.id) ?? null,
    is_attendee: attendeeEmails.has(u.email!),
  }));
}

export async function banUser(
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "indefinite",
  });
  if (error) return { error: error.message };
  return {};
}

export async function unbanUser(
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
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

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return {};
}
