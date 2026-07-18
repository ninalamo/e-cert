import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID } from "@/lib/org";
import type { UserRole } from "@/types/organization";

export type { UserRole };

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
}

/**
 * Default role assigned to newly registered users in the single-org model.
 */
export const DEFAULT_ROLE: UserRole = "participant";

/**
 * Resolve the current authenticated user and their role from user_memberships
 * for the single organization. Returns null if not authenticated or has no
 * membership (shouldn't normally happen since registration grants one).
 */
export async function getCurrentSession(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("user_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", ORG_ID)
    .single();

  const role = (membership?.role as UserRole) ?? DEFAULT_ROLE;

  return {
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata?.name as string | undefined) ?? null,
    role,
  };
}

/**
 * Capability checks derived from the 4-role model:
 * - admin:   full access, including audit trail and delete
 * - staff:   all except audit trail and delete
 * - participant: own profile + own certificates only
 * - guest:   unauthenticated; verify/search landing page only
 */
export function canManageCertificates(role: UserRole): boolean {
  return role === "admin" || role === "staff";
}

export function canManageEvents(role: UserRole): boolean {
  return role === "admin" || role === "staff";
}

export function canManageTemplates(role: UserRole): boolean {
  return role === "admin" || role === "staff";
}

export function canDelete(role: UserRole): boolean {
  return role === "admin";
}

export function canViewAuditTrail(role: UserRole): boolean {
  return role === "admin";
}

export function canManageMembers(role: UserRole): boolean {
  return role === "admin";
}

/**
 * A participant may only see certificates issued to their own email.
 */
export function canViewAllCertificates(role: UserRole): boolean {
  return role === "admin" || role === "staff";
}

import { redirect } from "next/navigation";

/**
 * Guard for server actions / pages. Redirects guests to /login.
 * Returns the session (user + role) for callers that need it.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Guard that requires at least one of the given roles, otherwise redirects
 * to /dashboard (or /login if unauthenticated).
 */
export async function requireRole(
  roles: UserRole[],
  redirectTo = "/dashboard"
): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect(redirectTo);
  return session;
}

/**
 * Returns the home path for the given role.
 * - participant → /my
 * - admin/staff → /dashboard
 */
export function getHomePathForRole(role: UserRole): string {
  return role === "participant" ? "/my" : "/dashboard";
}
