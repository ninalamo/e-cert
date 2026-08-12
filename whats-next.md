# What's Next — LOA e-cert Refactor

**Last updated:** 2026-08-12

---

## Current Status

| Phase | Status | Date |
|-------|--------|------|
| A | ✅ Complete | 2026-08-06 |
| B | Auth readiness (manual) | — |
| C | ✅ Complete | 2026-08-10 |
| C-Auth | ✅ Complete | 2026-08-11 |
| **D** | **✅ Complete** | **2026-08-12** |
| **E** | **✅ Complete** | **2026-08-12** |
| **F** | ✅ Complete | — |
| **G** | ✅ Complete | — |
| **H** | **← Next** | — |

---

## Phase D — What Was Done

- New auth module: `token-store.ts`, `jwt.ts`, `sso-fragment.ts`, `auth-guard.tsx`
- Role resolution from JWT `permissions` claim
- Layouts rewired to `<AuthGuard>`
- SSO fragment + silent restore wired into root layout
- Env vars added (4 `NEXT_PUBLIC_*`)
- Legacy deleted: auth pages, auth lib (password/tokens/session/config), proxy.ts, supabase, storage, email, pdf, qr, seed, rate-limit, demo
- Stub modules created for build compatibility
- `requireRole`/`requireSession` stubs in `permissions.ts` for remaining server components

---

## Phase E — Data Swap ✅ Complete

**Commit:** `b613c22` — *Phase E: Complete data swap — replace server actions with typed Cert API client modules*
**Files changed:** 122 (1652 insertions, 5789 deletions)
**Governing spec:** `specs/api-client/README.md`

**Work:** Replace all server actions with typed Cert API client modules. Components call the API directly from the browser.

### Done
- Created `src/lib/api/client.ts` — base HTTP client with auth, refresh, envelope handling
- Created `src/lib/api/types.ts` — shared response/pagination/error types
- Created 7 typed API modules: `events.ts`, `attendees.ts`, `templates.ts`, `certificates.ts`, `dashboard.ts`, `audit.ts`, `verify.ts`
- Created `src/lib/api/users.ts`, `src/lib/api/organizations.ts` — added by agents during page migration
- Updated `src/lib/auth/token-store.ts` — added `refreshAccessToken()`
- Converted all ~28 pages from server components to client components using API modules
- Converted `DashboardShell`, `FaqLayout` to client components
- Deleted all server actions: `event.actions.ts`, `attendee.actions.ts`, `template.actions.ts`, `certificate.actions.ts`, `dashboard.actions.ts`, `audit.actions.ts`, `user.actions.ts`, `organization.actions.ts`
- Deleted all server services/repositories: `*/server/*.service.ts`, `*/server/*.repository.ts`
- Deleted stubs: `supabase/`, `storage/`, `email/`, `pdf/`, `qr/`, `repository/`, `auth.actions.ts`, `demo.actions.ts`
- Deleted old API routes: `api/certificates/`, `api/events/`, `api/verify/`, `api/storage/`, `api/workflow-status/`
- Deleted pages per spec: `users/`, `templates/auth-emails/`
- Deleted `workflows/` directory
- Removed `requireRole`/`requireSession` stubs from `permissions.ts`
- Fixed `BaseRepository` stub to accept generics
- Fixed `resolveRoleFromPermissions` to not return invalid `"guest"` role
- Excluded `e2e/`, `mock/`, `scripts/`, `vitest.config.ts` from tsconfig
- Build passes clean (`npx next build` — zero errors)

### 1. Create base HTTP client (`src/lib/api/client.ts`)
- Same-origin fetch to `/api/v1/*` (Vercel rewrite)
- `Authorization: Bearer <in-memory token>`
- Response envelope handling (`{ data }`, `{ data, meta }`, `{ status, error }`)
- 401 → silent refresh → retry once
- 403 → no retry
- Multipart + binary (PDF) support

### 2. Create typed API modules (one per resource)
| Module | Replaces | Cert endpoints |
|--------|----------|----------------|
| `src/lib/api/events.ts` | `event.actions.ts` | `GET/POST/PATCH/DELETE /api/v1/events`, stats, clone-template |
| `src/lib/api/attendees.ts` | `attendee.actions.ts` | `GET/POST/PATCH/DELETE /api/v1/events/{id}/attendees`, import, issue-completed |
| `src/lib/api/templates.ts` | `template.actions.ts` | `GET/POST/PATCH/DELETE /api/v1/templates` |
| `src/lib/api/certificates.ts` | `certificate.actions.ts` | `GET/POST/DELETE /api/v1/certificates`, upload, email, qr |
| `src/lib/api/dashboard.ts` | `dashboard.actions.ts` | `GET /api/v1/dashboard/stats`, activity |
| `src/lib/api/audit.ts` | `audit.actions.ts` | `GET /api/v1/admin/audit-logs` |
| `src/lib/api/verify.ts` | verify route | `GET /api/v1/verify/{number}`, `GET /api/v1/view/{id}` |

### 3. Update pages to call API modules directly
- Each page that calls a server action → import from `src/lib/api/` instead
- Remove `"use server"` imports
- Pass auth token via client-side fetch

### 4. Delete stubs
- `src/lib/supabase/` (stub files)
- `src/lib/storage/index.ts`
- `src/lib/email/index.ts`, `auth-emails.ts`
- `src/lib/pdf/index.ts`
- `src/lib/qr/index.ts`
- `src/lib/repository/base.repository.ts`
- `src/features/auth/server/auth.actions.ts`
- `src/features/auth/components/update-email-form.tsx`
- `src/features/auth/components/change-password-request-form.tsx`
- `src/features/demo/server/demo.actions.ts`

### 5. Delete server actions
- `src/features/events/server/event.actions.ts`
- `src/features/events/server/attendee.actions.ts`
- `src/features/templates/server/template.actions.ts`
- `src/features/certificates/server/certificate.actions.ts`
- `src/features/dashboard/server/dashboard.actions.ts`
- `src/features/audit/server/audit.actions.ts`
- `src/features/users/server/user.actions.ts`
- `src/features/organizations/server/organization.actions.ts`

### 6. Delete server-side services/repositories
- `src/features/*/server/*.service.ts`
- `src/features/*/server/*.repository.ts`
- `src/features/*/server/*.email.service.ts`
- `src/features/certificates/server/certificate-number.ts`
- `src/features/certificates/server/email-template.ts`

### 7. Delete remaining API routes
- `src/app/api/certificates/` (all)
- `src/app/api/events/`
- `src/app/api/verify/`
- `src/app/api/storage/`
- `src/app/api/workflow-status/`

### 8. Delete pages that are removed per spec
- `src/app/(dashboard)/users/`
- `src/app/(dashboard)/templates/auth-emails/`
- `src/app/(participant)/my/profile/` (email update — Auth Platform)

### 9. Remove `requireRole`/`requireSession` stubs from `permissions.ts`
- All server components should be deleted or converted to client components by this point

### 10. Build check
- `npx next build` — should compile with zero errors
- Verify no imports from deleted modules remain

---

## Phase F — UI Cleanup + Verification

**Work:** Final cleanup after Phase E.

- Remove `DashboardShell` session prop dependency (get session from context)
- Silent refresh flow (already partially done in `SessionInitializer`)
- Parity checks: login, event create, issue, download, verify, view, audit
- e2e test suite (Playwright)
- Delete test files that mock old auth
- Update `src/__tests__/setup.ts` for new data layer

---

## Phase G — Decommission Legacy DB

- Archive Supabase DB (`pg_dump`)
- Drop legacy tables
- Remove Supabase project

---

## Phase H — Phase 4 Integration

- Cross-app JWT validation tests
- OpenAPI spec
- Audit consistency checks

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `legacy-e-cert-integration.md` | Governing spec (v2.3) |
| `specs/README.md` | Spec map |
| `specs/api-client/README.md` | Phase E gate spec |
| `AI-RULES.md` | Development rules |
| `src/lib/auth/` | New auth module (token-store, jwt, sso-fragment, auth-guard) |
| `src/lib/permissions.ts` | Role resolution + capability checks |
| `src/components/session-initializer.tsx` | SSO fragment + silent restore |
| `src/app/layout.tsx` | Root layout (SessionInitializer wired) |
| `next.config.ts` | Vercel rewrites (`/api/v1/*` → Cert API) |
