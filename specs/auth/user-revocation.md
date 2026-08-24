# LOA e-cert — User Access Revocation (Auth Platform Integration)
## Product Assembly Component Specification

**Version:** 0.1
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Cross-cutting / Auth Platform dependency
**Audience:** Engineers, AI Development Agents

> **Related:** `legacy-e-cert-integration.md` §removed-pages ("Auth Platform owns user management"),
> `specs/auth/account-management.md`.
> Enforcement lives in the **Auth Platform** (`UserController`, `IdentityService`, `PermissionMiddleware`).

---

# 1. Purpose

It answers:

> **"How can cert-admin revoke a user's access from within this app — revocation only, never deletion?"**

The governing spec assigns user management to Auth Platform. This spec documents the platform API
that already implements revoke-without-delete, the permission bootstrap required, and the open
integration decisions before any e-cert UI consumes it.

---

# 2. Platform capability (verified 2026-08-24)

| Endpoint | Permission key | Effect |
|----------|----------------|--------|
| `GET /api/v1/users`, `GET /users/{id}` | `users.view` | List / show users |
| `PATCH /api/v1/users/{id}/status` `{status:"active"\|"disabled"}` | `users.manage` | Revoke or restore access |
| `POST /api/v1/users/{id}/permissions` | `users.manage` | Grant permission to user |
| `POST /api/v1/groups/{id}/permissions` | `users.manage` | Sync permissions on group |

Revocation semantics (`IdentityService::setUserStatus('disabled')`) — verified in source:

1. `users.status = 'disabled'` → login rejects disabled accounts
2. `revokeAllRefreshTokens()` → all existing sessions die at next refresh
3. **No DELETE endpoint exists** for users — "never delete" enforced by design
4. Platform-admin members cannot be disabled (403 guard)

Permission enforcement is a literal claim match:
`in_array('users.manage', jwt.permissions)` — distinct from cert-app's path-scoped
`read:/write:/admin:` levels.

---

# 3. Current state (verified against `loa_auth` DB, 2026-08-24)

- `cert-admin` does **not** hold `users.view` or `users.manage`
- `group_claims` and `user_group_permission` are empty — cert claims originate from tenant-endpoint
  grants, not these auth-level keys
- Only the seeded `loa-auth-admin` can perform the bootstrap grant

---

# 4. Bootstrap runbook (one-time, executed by platform admin)

Grant to the **group** (preferred over per-user so future cert-admins inherit):

```bash
# 1. Find group id (expected: cert-admin = 2)
GET {AUTH_BASE}/api/v1/groups            # Authorization: Bearer <platform-admin token>

# 2. Grant both keys to the cert-admin group
POST {AUTH_BASE}/api/v1/groups/{groupId}/permissions
Body: { "permission_keys": ["users.view", "users.manage"] }   # verify exact payload shape
```

Equivalent web UI path: `{AUTH_BASE}/admin` → Groups → cert-admin → Permissions.
New tokens issued after the grant carry the claims automatically; existing tokens do not.

---

# 5. Integration decisions (resolved 2026-08-24)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Transport | **Next rewrite**: `/auth-api/v1/:path*` → `{AUTH_API_TARGET}/api/v1/:path*` (new server env `AUTH_API_TARGET`; local `http://localhost:8080`, prod auth host). Same-origin, no CORS changes |
| 2 | Governing-spec deviation | e-cert hosts a **revocation-only** users page consuming Auth Platform APIs; amendment to be recorded in governing doc by owner. Deletion remains impossible — platform has no user DELETE endpoint |
| 3 | First-slice scope | User list + Disable/Enable with confirm dialog only; groups/permission management out of scope |
| 4 | Dead "Users" nav link | Resolved — `/users` is now a real claim-gated page; nav entry visible only with `users.view` |

Implementation notes:

- API module: `src/lib/api/users-admin.ts` (`usersAdminApi.list/setStatus`)
- Claim helpers: `permissions.ts` → `canViewUsers()` / `canManageUserStatus()`
- Page: `(dashboard)/users/page.tsx` — hides actions for self; surfaces platform 403
  ("Platform administrators cannot be deactivated.") as an inline error banner

---

# 6. Acceptance criteria (future implementation gate)

1. cert-admin JWT contains `users.view` + `users.manage`
2. Disabled user cannot log in and all refresh tokens revoked (platform-verified)
3. No user-deletion affordance exists anywhere in e-cert
4. Revocation actions appear in audit trail per platform behavior
