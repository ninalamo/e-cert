import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
 * Resolve the current authenticated user and their role from proxy-injected
 * headers. Returns null if not authenticated.
 */
export async function getCurrentSession(): Promise<SessionUser | null> {
  const hdrs = await headers();
  const proxyUserId = hdrs.get("x-user-id");
  const proxyUserEmail = hdrs.get("x-user-email");
  const proxyUserName = hdrs.get("x-user-name");
  const proxyUserRole = hdrs.get("x-user-role");

  if (proxyUserId) {
    return {
      id: proxyUserId,
      email: proxyUserEmail || null,
      name: proxyUserName || null,
      role: (proxyUserRole as UserRole) ?? DEFAULT_ROLE,
    };
  }

  return null;
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

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

/**
 * A participant may only see certificates issued to their own email.
 */
export function canViewAllCertificates(role: UserRole): boolean {
  return role === "admin" || role === "staff";
}

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
