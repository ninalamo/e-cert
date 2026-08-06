# LOA e-cert — Frontend Role Resolution
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Auth Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §7.4 (Frontend Role Resolution)

---

# 1. Purpose

It answers:

> **"How does the `e-cert` frontend derive a coarse UI role (`admin`/`staff`/`participant`/`guest`) from the Auth Platform's level-based JWT `permissions` claim?"**

---

# 2. Scope

## Owns

- `resolveRoleFromPermissions()` function
- `hasLevel()` helper
- Integration with `src/lib/permissions.ts` capability functions

## Does Not Own

- Permission granting (Auth Platform)
- Permission enforcement (Cert API)
- Group membership management (Auth Platform)

---

# 3. Contract

## 3.1 Permission Claim Shape

```json
[
  "cert.certificates.issue",
  "read:/api/v1/events",
  "write:/api/v1/certificates",
  "admin:/api/v1/admin/audit-logs"
]
```

Only `<level>:<path>` entries drive role resolution. `cert.*` keys are not consulted.

## 3.2 Resolution Rules

```typescript
type Level = "read" | "write" | "admin";

function hasLevel(permissions: string[], level: Level): boolean {
  return permissions.some(p => p.startsWith(`${level}:`));
}

function resolveRoleFromPermissions(permissions: string[]): UserRole {
  if (hasLevel(permissions, "admin")) return "admin";
  if (hasLevel(permissions, "write")) return "staff";
  if (hasLevel(permissions, "read"))  return "participant";
  return "guest";
}
```

**Priority:** `admin` > `write` > `read` > `guest`.

## 3.3 Output Type

```typescript
type UserRole = "admin" | "staff" | "participant" | "guest";
```

Matches the existing `UserRole` type in `src/types/organization.ts`.

---

# 4. Mapping to Seed Groups

| Seed group | Grants | Resolved role |
|------------|--------|---------------|
| `cert-admin` | `admin` on every Cert path | `admin` |
| `cert-staff` | `write` on management paths, `read` on read paths | `staff` |
| `cert-user` | `read` on `/me/certificates*` only | `participant` |
| (unassigned) | No `<level>:<path>` entries | `guest` |

---

# 5. Integration Points

| Consumer | How it uses role |
|----------|------------------|
| `src/lib/permissions.ts` `getCurrentSession()` | Sets `role` from resolved role |
| Route guard | Redirects to `/my` (participant) or `/dashboard` (admin/staff) |
| Capability functions | `canManageCertificates(role)`, `canDelete(role)`, etc. |

---

# 6. Staleness

| Concern | Detail |
|---------|--------|
| Token TTL | 15 min; group/grant changes take effect at next refresh |
| Admin revocation | Immediate at API level; UI updates at next refresh |

---

# 7. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Looking up role from DB | Role derived from JWT claims only |
| Using `cert.*` keys for frontend gating | Only `<level>:<path>` entries drive role |
| Caching role across token refreshes | Re-derive from fresh token on every read |

---

# 8. Guiding Principle

> **Claims-driven role.** The frontend role is a derived view of the JWT `permissions` claim, not a stored or looked-up value.
