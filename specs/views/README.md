# Views

**Version:** 1.0
**Status:** Final
**Layer:** `views` (routes/pages)
**Audience:** Engineers, AI Development Agents

> Governs Next.js routes only. UI workflows live in `../features/`. Shared components in `../ui/`. Data access in `../services/api-client.md`.

---

# 1. Purpose

It answers:

> **"Which routes exist, who can see them, and what feature do they render?"**

---

# 2. Scope

## Owns

- Route table, auth gating per route, public vs. protected split.
- Which `src/app/` file renders which `src/features/` workflow.

## Does Not Own

- Feature logic (see `../features/`).
- Auth flow internals (see `../services/auth.md`).
- Cert API shapes (see `../services/api-client.md`).

---

# 3. UI Contract

## Public (no token)

| Route | File | Renders |
|-------|------|---------|
| `/` | `src/app/page.tsx` | landing |
| `/verify` + `/verify/[certificateNumber]` | `src/app/verify/` | public verify via `GET /api/v1/verify/{number}` |
| `/view/[id]` | `src/app/view/[id]/` | public viewer via `GET /api/v1/view/{id}` |
| `/faq` | `src/app/faq/` | static FAQ |

## Protected (auth guard → SSO `/sso/login`)

| Route | Renders |
|-------|---------|
| `/(dashboard)/dashboard` | `features/dashboard` stats + activity |
| `/(dashboard)/events*` (list, new, `[id]`, upload, issue) | `features/events` — CSV parsed client-side → `POST` JSON to `/attendees/import`; bulk ops also via legacy `/api/events/*` (see `../services/api-client.md`) |
| `/(dashboard)/certificates*` (list, issue, `[id]`) | `features/certificates` — PDF/QR/email via Cert API |
| `/(dashboard)/templates/certificates*` + `templates/emails*` | `features/templates` TipTap → `PATCH /api/v1/templates` |
| `/(dashboard)/audit` | `features/audit` (`admin` endpoints) |
| `/(dashboard)/users` | admin user management (`usersAdminApi` → `/service/users*`, `user-activity`) — revoke/enable + role change, **never delete** |
| `/(participant)/my`, `my/certificates*` | participant own-data via `/me/certificates*` |
| `/(participant)/my/profile` | **read-only** account display (name/email/role from JWT) + link-out to Auth password change — email/identity edits live on Auth |

## Removed (do not re-add)

| Route | Owner now |
|-------|-----------|
| `/(auth)/login`, `register`, `forgot-password`, `update-password` | Auth Platform |
| `/(dashboard)/templates/auth-emails*` | Auth Platform |

---

# 4. API Calls

Views are shells: they render `features/` components, which call `src/lib/api/` typed modules via BFF `/api/v1/*`. Two known exceptions live in view-level components (migrate to the typed client when touched):

- `events/[id]/components/attendees-tab.tsx:authFetch` — bulk ops via legacy `/api/events/*`.
- `my/profile/page.tsx` — reads JWT claims directly for display (no API call at all).

---

# 5. Rules

- Authenticated views render behind client-side auth guard; Cert API is the security boundary, never the route file.
- No `"use server"`, no server actions, no Supabase imports in any view.
- `organization_id` is still sent by some create calls (see `../services/api-client.md`) — do not add new sends; target is JWT-resolved org.
- Role gating reads JWT `permissions` claim for display only (`resolveRoleFromPermissions()`); enforcement is server-side.

---

# 6. Tests

- [ ] `e2e/tests/auth/auth-flow.spec.ts` (exists) — unauthenticated → SSO redirect; callback → dashboard; failure shows error; logout clears.
- [ ] Planned: roles gating + page-render suites (see `../services/testing.md`).

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Re-adding auth pages or auth-email templates | Owned by Auth Platform |
| Fetching in `page.tsx` via server action | All data via client-side `src/lib/api/` (plus the two documented exceptions in §4) |
| Polling for async workflow status | Bulk ops are synchronous — no polling |

---

# 8. Guiding Principle

> **Routes are shells.** They gate access and render features; all logic lives in `features/` + `services/`.
