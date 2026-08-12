import { parseAccessToken, type JwtPayload } from "@/lib/auth/jwt";
import { getAccessToken } from "@/lib/auth/token-store";
import type { UserRole } from "@/types/organization";

export type { UserRole };

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
}

export const DEFAULT_ROLE: UserRole = "participant";

type Level = "read" | "write" | "admin";

function hasLevel(permissions: string[], level: Level): boolean {
  return permissions.some((p) => p.startsWith(`${level}:`));
}

export function resolveRoleFromPermissions(permissions: string[]): UserRole {
  if (hasLevel(permissions, "admin")) return "admin";
  if (hasLevel(permissions, "write")) return "staff";
  if (hasLevel(permissions, "read")) return "participant";
  return "guest";
}

export function getCurrentSession(): SessionUser | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = parseAccessToken(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email || null,
    name: payload.name,
    role: resolveRoleFromPermissions(payload.permissions),
  };
}

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

export function canViewAllCertificates(role: UserRole): boolean {
  return role === "admin" || role === "staff";
}

export function getHomePathForRole(role: UserRole): string {
  return role === "participant" ? "/my" : "/dashboard";
}

// Phase D stubs — server-side guards replaced by AuthGuard (client-side)
// These exist only so remaining server components/actions compile.
export async function requireSession(): Promise<SessionUser> {
  return { id: "stub", email: null, name: null, role: DEFAULT_ROLE };
}

export async function requireRole(
  roles: UserRole[],
  redirectTo = "/dashboard"
): Promise<SessionUser> {
  return { id: "stub", email: null, name: null, role: DEFAULT_ROLE };
}
