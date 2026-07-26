import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ORG_ID } from "@/lib/org";
import { getSession } from "@/lib/auth/session";
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

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Resolve the current authenticated user and their role.
 *
 * 1. Fast path – proxy-injected headers (set by src/proxy.ts).
 * 2. Fallback – read JWT cookie directly and look up role from DB.
 *
 * Returns null if not authenticated.
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

  // Fallback: read the session cookie directly (for server actions where
  // proxy headers may not be forwarded).
  const jwt = await getSession();
  if (!jwt) return null;

  const db = supabaseAdmin();
  if (!db) return null;

  const { data: membership } = await db
    .from("user_memberships")
    .select("role")
    .eq("user_id", jwt.sub)
    .eq("organization_id", ORG_ID)
    .single();

  return {
    id: jwt.sub,
    email: jwt.email || null,
    name: jwt.name,
    role: (membership?.role as UserRole) ?? DEFAULT_ROLE,
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
