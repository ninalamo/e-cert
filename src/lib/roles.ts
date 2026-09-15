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
export type EditableRole = (typeof EDITABLE_ROLES)[number];

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
  if (!(EDITABLE_ROLES as readonly string[]).includes(certRoles[0])) {
    return "Only Staff/User roles can be changed.";
  }
  return null;
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
