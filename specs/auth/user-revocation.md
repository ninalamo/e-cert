# LOA e-cert — User Access Revocation (Auth Platform Integration)
## Product Assembly Component Specification

**Version:** 0.3
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

# 3. Permission state (verified against `loa_auth` DB, 2026-08-24)

- `user_group_permission` grants all seven auth keys (`users.view/manage`, `groups.*`,
  `permissions.*`, `auth.verify`) to **`loa-auth-admin`** only — this is the full "Effective
  Permissions" set seen in the admin panel for Super Admin, not a cert-admin property
- `cert-admin` originally held none; on 2026-08-24 `users.view` + `users.manage` were granted to
  the `cert-admin` group **in the local DB**, so real cert-admin logins now receive both claims at
  token issue (log out/in after grant)
- Production still requires the equivalent one-time grant by a platform admin (§4 runbook)
- cert claims (`read:/…`, `write:/…`, `admin:/…` scoped entries) come from tenant-endpoint grants —
  a separate mechanism from these flat auth keys

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

---

## 7.2 Auth-api change — server-side directory query (revised v0.3)

**Scale reality:** tenant users grow with every event (attendee imports upsert users), so the
directory must paginate/filter **server-side**. Client-side pagination over a full list is rejected
(v0.2 decision reversed).

`UserController::index` gains query params and returns cert-style meta:

```
GET /api/v1/users?limit=25&offset=0&search=<name|email>&group_id=<uuid>
→ { data: [{ …existing fields, groups: [{id,name}] }],
    meta: { limit, offset, total, has_more } }
```

Implementation notes:

- `User::with('userGroups:id,name')` eager load — no N+1; `groups[]` included per user.
- Tenant scoping + platform-admin exclusion unchanged.
- `search`: case-insensitive LIKE on name/email. `group_id`: `whereHas('userGroups')`.
- `limit` clamp 1–100 (default 25); `total` via base-query count before skip/take.

## 7.3 e-cert UX — table layout

Rendered with the shared `<Table>` primitives (`components/ui/table.tsx`) + `<Paginator>`:

| Column | Content |
|--------|---------|
| User | Name (+ "(you)") over muted email |
| Groups | Badge pill per group (platform-admin distinct); muted "no group" when empty |
| Activity | Existing award/calendar badges (user-activity.md) |
| Status | Active/Disabled pill |
| Actions | Labeled **Revoke** button (danger, opens yes/no confirm dialog) or Enable; hidden for self / non-managers |

Above the table: search input (debounced 300 ms, matches name/email) and Group `<Select>`
(options from `GET /auth-api/v1/groups`, requires `users.manage`; default "All groups").
Filters combine; any change resets page to 1. Pagination maps page⇄offset via `meta.total`.

## 7.4 Acceptance criteria

1. Each row shows at least one group badge; users with no group show a muted "no group" pill.
2. Search matches name/email; group dropdown filters by id; both compose server-side; Paginator
   reflects `meta.total` of the filtered set and resets on filter changes.
3. Revoke button is text-labeled and still gated by `canManageUserStatus`, hidden for self.
4. Directory stays responsive at large user counts (server paginates; no full-list fetch).
5. Existing behaviors preserved: tenant scoping, platform-admin protection, failure isolation.

---

# 8. Doc control

| Version | Date | Change |
|---------|------|--------|
| 0.1 | 2026-08-24 | Initial draft: platform capability verification, permission bootstrap, integration decisions, acceptance criteria. |
| 0.2 | 2026-08-24 | §7 Users directory enhancements: auth-api index gains `groups[]` (eager-loaded), client-side search/group-filter/pagination via shared Paginator, explicit Revoke button label. |
| 0.3 | 2026-08-24 | Scale correction: tenant users grow per-event (attendee upserts) → **server-side** limit/offset/search/group_id with `{data,meta}` envelope; UX switched to a **table** layout; group-filter options sourced from `/groups`; search narrowed to name/email. |
