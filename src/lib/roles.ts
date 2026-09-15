import type { ManagedGroup, ManagedUser, UserGroupRef } from "@/lib/api/users-admin";

// Backend group names stay as values everywhere (API, filter value, keys).
// Only display text is mapped here.
export const ROLE_LABELS: Record<string, string> = {
  "cert-admin": "Vericert Admin",
  "cert-staff": "Vericert Staff",
  "cert-user": "Vericert User",
  "loa-auth-admin": "Platform Admin",
};

export const EDITABLE_ROLES = ["cert-staff", "cert-user"] as const;
export type EditableRole = (typeof EDITABLE_ROLES)[number] | "cert-admin";

/** Lateral (non-elevating) targets shown in the segmented control. */
export const LATERAL_ROLES = ["cert-staff", "cert-user"] as const;

const CERT_ROLE_ORDER = ["cert-admin", "cert-staff", "cert-user"] as const;

export function roleLabel(name: string): string {
  return ROLE_LABELS[name] ?? name;
}

export function getCertRoleNames(groups?: UserGroupRef[] | null): string[] {
  return (groups ?? [])
    .map((g) => g.name)
    .filter((n) => n.startsWith("cert-"));
}

export function isRoleEditable(user: ManagedUser): boolean {
  const certRoles = getCertRoleNames(user.groups);
  return (
    certRoles.length === 1 &&
    (EDITABLE_ROLES as readonly string[]).includes(certRoles[0])
  );
}

export function roleEditBlockReason(
  user: ManagedUser,
  isSelf: boolean
): string | null {
  if (isSelf) return "You cannot change your own role.";
  const certRoles = getCertRoleNames(user.groups);
  if (certRoles.length === 0) return "Only Staff/User roles can be changed.";
  if (certRoles.length > 1) return "Multiple roles assigned — edit in Auth admin.";
  if (certRoles[0] === "cert-admin") return "Admins are managed in Auth admin.";
  if (!(EDITABLE_ROLES as readonly string[]).includes(certRoles[0])) {
    return "Only Staff/User roles can be changed.";
  }
  return null;
}

/**
 * Allowed reassignment targets for the e-cert UI.
 * - cert-user  → cert-staff (lateral) or cert-admin (promotion)
 * - cert-staff → cert-user (lateral) or cert-admin (promotion)
 * - cert-admin → none here (demote/revoke only in Auth admin)
 * - self / no / multiple cert roles → none
 */
export function roleTargets(
  user: ManagedUser,
  isSelf: boolean
): Exclude<EditableRole, never>[] {
  if (isSelf) return [];
  const certRoles = getCertRoleNames(user.groups);
  if (certRoles.length !== 1) return [];
  const current = certRoles[0];
  if (current === "cert-user") return ["cert-staff", "cert-admin"];
  if (current === "cert-staff") return ["cert-user", "cert-admin"];
  return [];
}

/** Lateral targets rendered in the segmented control (excludes promotion). */
export function lateralRoleTargets(
  user: ManagedUser,
  isSelf: boolean
): ("cert-staff" | "cert-user")[] {
  return roleTargets(user, isSelf).filter(
    (t): t is "cert-staff" | "cert-user" =>
      (LATERAL_ROLES as readonly string[]).includes(t)
  );
}

export function canPromoteToAdmin(user: ManagedUser, isSelf: boolean): boolean {
  return roleTargets(user, isSelf).includes("cert-admin");
}

export function isCertAdminCaller(callerGroups: string[]): boolean {
  return callerGroups.includes("cert-admin");
}

export function isStaffCaller(callerGroups: string[]): boolean {
  return (
    !callerGroups.includes("cert-admin") &&
    callerGroups.includes("cert-staff")
  );
}

/** Re-assignment is a cert-admin-only feature (segmented control + promote). */
export function canReassignRole(
  user: ManagedUser,
  isSelf: boolean,
  callerGroups: string[],
  canManage: boolean
): boolean {
  if (!canManage || isSelf) return false;
  if (!isCertAdminCaller(callerGroups)) return false;
  return roleTargets(user, isSelf).length > 0;
}

export function reassignBlockReason(
  user: ManagedUser,
  isSelf: boolean,
  callerGroups: string[]
): string | null {
  if (isSelf) return "You cannot change your own role.";
  if (!isCertAdminCaller(callerGroups)) {
    return "Only Vericert Admins can change roles.";
  }
  return roleEditBlockReason(user, false);
}

/** Staff may only revoke (disable) active accounts holding only cert-user. */
export function isStaffRevocableTarget(user: ManagedUser): boolean {
  const certRoles = getCertRoleNames(user.groups);
  return certRoles.length === 1 && certRoles[0] === "cert-user";
}

export function canChangeStatus(
  user: ManagedUser,
  isSelf: boolean,
  callerGroups: string[],
  canManage: boolean,
  next: "active" | "disabled"
): boolean {
  if (!canManage || isSelf) return false;
  if (isCertAdminCaller(callerGroups)) return true;
  // Staff: revoke-only, no restores, Vericert User targets only.
  if (next !== "disabled") return false;
  return (
    isStaffCaller(callerGroups) &&
    user.status === "active" &&
    isStaffRevocableTarget(user)
  );
}

export function sortCertGroupsFirst(groups: ManagedGroup[]): ManagedGroup[] {
  return [...groups].sort((a, b) => {
    const ai = CERT_ROLE_ORDER.indexOf(a.name as (typeof CERT_ROLE_ORDER)[number]);
    const bi = CERT_ROLE_ORDER.indexOf(b.name as (typeof CERT_ROLE_ORDER)[number]);
    const rankA = ai === -1 ? 99 : ai;
    const rankB = bi === -1 ? 99 : bi;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
}

export function filterableRoleGroups(groups: ManagedGroup[]): ManagedGroup[] {
  // Filter dropdown lists cert roles only; table still renders all groups.
  return sortCertGroupsFirst(groups.filter((g) => g.name.startsWith("cert-")));
}
