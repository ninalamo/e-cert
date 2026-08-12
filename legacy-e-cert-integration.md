# LOA Cert Platform — Legacy `e-cert` Integration & Refactor
## Product Assembly Component Specification

**Version:** 2.2
**Status:** Final
**Layer:** Product Assembly (`loa-cert-platform`)
**Audience:** Architects, Engineers, AI Development Agents

> **Purpose.** This spec designs the refactor of the legacy `e-cert` application (Next.js 16 / TypeScript, self-hosted auth + Supabase Postgres) into a **pure consumer** of the LOA Auth Platform (`loa-auth-platform`; identity, SSO, JWT, user-groups + grants) and the LOA Cert Platform (`loa-cert-platform`; domain API v1.2, PDF/QR/email). It is the "later pass" referenced by `api-endpoints.md` §9.9 that replaces the `cert.*`-key permission table in `web-ui.md` §5 with the level-based model, and it refactors the SSO token-lifecycle spec into a **client-side SPA** (CSR) that consumes both platforms over HTTP.
>
> Spec-first: **no implementation code** is written against this document until it (and its governing specs) are **Final** (AI-RULES.md Rule 0).

---

# Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Target Architecture](#3-target-architecture)
4. [Current-State Inventory](#4-current-state-inventory)
5. [Locked Decisions](#5-locked-decisions)
6. [Identity & SSO Integration](#6-identity--sso-integration)
7. [Roles & Grants via Auth Platform User-Groups](#7-roles--grants-via-auth-platform-user-groups)
8. [Cert Platform API Consumption](#8-cert-platform-api-consumption)
9. [Frontend & Feature Changes](#9-frontend--feature-changes)
10. [Environment & Deployment](#10-environment--deployment)
11. [Legacy Decommissioning](#11-legacy-decommissioning)
12. [Implementation Plan](#12-implementation-plan)
13. [Risks & Open Questions](#13-risks--open-questions)
14. [References](#14-references)

---

# 1. Purpose

The legacy `e-cert` app is a Next.js 16 application that today implements **everything itself**: custom HS256 JWT auth over a Supabase Postgres database, bcryptjs passwords, a `user_memberships` role model, puppeteer PDF rendering, nodemailer email, and a full admin/participant UI.

Per `PROJECT.md` (Phase 3 + Phase 4), the platform split is:

- **Auth** → `auth.lyceumalabang.edu.ph` (Laravel 12, `loa_auth`): identity, SSO, JWT issuance, user-groups + endpoint grants.
- **Cert** → `cert-api.lyceumalabang.edu.ph` (Laravel 12, `loa_cert`): certificate domain API, verification, PDF/QR/email generation, audit.
- **UI** → the refactored `e-cert` Next.js app (Vercel, `e-cert.vercel.app`), which **no longer owns identity or data**; it renders the UI and talks to the two platforms over HTTP.

This spec answers:

> **"How is the legacy `e-cert` Next.js app refactored so that it stops being an auth/data owner and becomes the consumer UI for the LOA Auth + Cert platforms?"**

It covers: (a) removing the self-hosted auth stack and adopting the Auth Platform SSO, (b) resolving the legacy role model through Auth Platform user-groups and level-based endpoint grants, (c) replacing every Supabase data access with the Cert Platform API, (d) what is removed vs. kept in the UI, (e) environment/deployment changes, (f) decommissioning the legacy database, and (g) a spec-gated implementation plan.

---

# 2. Scope

## 2.1 In Scope (this spec)

| Area | Coverage |
|------|----------|
| Auth swap | Remove custom auth (jose-signing, bcrypt, `users`/`refresh_tokens`/`password_resets`/`email_confirmations`/`user_memberships`), adopt Auth Platform SSO + JWT validation |
| Role model | Legacy `admin`/`staff`/`participant` → Auth Platform user-groups granted **level-based** endpoint levels; frontend role resolution from the JWT `permissions` claim |
| Data access | Every Supabase/PostgREST read/write replaced by Cert Platform API v1.2 calls |
| Feature mapping | Legacy server actions + API routes mapped to Cert endpoints (server actions are **deleted**; the client calls the API directly); removed features enumerated |
| Frontend | Client-side auth guard, in-memory token session handling, pages to keep/remove, editor persistence |
| Env / deploy | New env contract for `e-cert`, origins/topology (`e-cert.vercel.app` UI + `cert-api.lyceumalabang.edu.ph` API), Vercel rewrites |
| Decommission | Legacy Supabase DB **archive then drop** after verified cutover |

## 2.2 Out of Scope (owned elsewhere or deferred)

| Feature | Owner / Reason |
|---------|----------------|
| Login, register, forgot/update password, email confirm | Auth Platform (`auth.lyceumalabang.edu.ph`) — all auth UI removed from `e-cert` |
| User / role / membership / group management | Auth Platform (`users.manage`) + Auth admin dashboard |
| Permission/endpoint catalog management | Auth Platform (`/api/v1/admin/tenants/{tenant}/endpoints/*`) |
| SSO callback decryption, token issuance, refresh/logout proxying | Cert Platform API (`api-endpoints.md` §9) |
| Auth-type email templates (`auth_process`) | Belongs to Auth Platform; `e-cert` template pages only cover `certificate` / `email` |
| PDF / QR / email generation | Cert Platform (DOMPDF etc., per `PROJECT.md` Phase 3) |
| Audit-log *deletion* endpoints | Not exposed in Cert API v1.2 — deferred (§13) |
| Demo mode / impersonation | Excluded by decision (matches `api-endpoints.md` §2.2) |
| Workflow runtime (`.well-known/*`, `/api/workflow-status`) | Framework internals; Cert bulk operations are synchronous (§13) |
| `POST /api/health` admin master-reset, `DELETE /api/storage/cleanup` | Excluded per `api-endpoints.md` §2.2 |
| Legacy data migration | **Fresh start** — no domain or identity data migrates (Decision D2) |

---

# 3. Target Architecture

```
                    ┌─────────────────────────────────────────────┐
   Browser          │  e-cert.vercel.app  (Next.js 16, SPA)       │
                    │  - SSO fragment handling (#payload=)         │
                    │  - client-side auth guard + in-memory token │
                    │  - TipTap editors, pages, components         │
                    │  - HTTP client → Cert API v1.2               │
                    └───────┬──────────────────────┬───────────────┘
                            │ SSO redirect         │ same-origin /api/v1/*
                            ▼                      │ Vercel rewrite
             ┌─────────────────────────────┐       ▼
             │  auth.lyceumalabang.edu.ph  │  ┌──────────────────────────────┐
             │  (Laravel, loa_auth)        │  │  cert-api.lyceumalabang.edu.ph │
             │  login / SSO / JWT          │  │  (Laravel, loa_cert)          │
             │  user-groups + grants       │  │  jwt.auth + jwt.endpoint      │
             │  GET /api/v1/auth/access    │  │  domain endpoints (§8)        │
             └─────────────────────────────┘  │  PDF / QR / email / audit     │
                                             └──────────────────────────────┘
```

Key properties:

1. **No DB access from the frontend.** `e-cert` removes every Supabase/PostgREST import. All domain reads/writes go through the Cert API; identity comes only from the JWT.
2. **No local identity, no server-side auth.** `e-cert` no longer signs tokens, stores password hashes, or reads a users table. There is no httpOnly access-token cookie, no proxy auth injection, and no server actions — identity is the Auth Platform's access token (claims: `sub`, `email`, `name`, `tenant`, `groups`, `permissions`) held **in memory** only.
3. **Shared secrets (server-side only).** `JWT_SECRET` (HS256) is shared by Auth and Cert for local verification; `ENCRYPTION_KEY` / `ENCRYPTION_KEY_PREVIOUS` are shared by Auth (encrypt) and Cert (decrypt). `e-cert` holds **no secrets** — it never encrypts/decrypts the SSO payload (forwards it to the Cert callback, `api-endpoints.md` §9.2–9.3) and never verifies signatures (CSR decision, D8 superseded).
4. **Split origin.** The e-cert UI runs on Vercel (`e-cert.vercel.app`); the Laravel Cert API is a dedicated API host at `cert-api.lyceumalabang.edu.ph`. The Next.js app proxies `/api/v1/*` to the Cert API via Vercel rewrites (§10.7), keeping the browser same-origin so the httpOnly `loa_cert_refresh` cookie keeps working; direct cross-origin with CORS is the fallback. (Q-1 resolved, §13.)
5. **Level-based authorization.** The Cert platform enforces `<level>:<path>` grants (`api-endpoints.md` §4, §9.5). The frontend derives a coarse UI role from the same `permissions` claim for nav/gating (§7.4) — display only, never a security boundary.

---

# 4. Current-State Inventory

Verified against the live `D:\repos\hobby\e-cert` source and its docs (`route-documentation.md`, `schema-documentation.md`, `API_Endpoints_Documentation.md`).

## 4.1 Stack & Architecture

| Concern | Legacy implementation |
|---------|----------------------|
| Framework | Next.js 16 (App Router) + TypeScript; `src/proxy.ts` (Next 16 proxy, formerly middleware) |
| Database | PostgreSQL via Supabase; PostgREST client `supabaseAdmin` (`@supabase/postgrest-js`); RLS + `app.user_id` GUC; JSONB blobs (`rendered_pdf` base64, `file_data`) |
| Auth | Custom HS256 JWT via `jose` (`src/lib/auth/jwt.ts`), httpOnly `session` cookie + `refresh` cookie, bcryptjs password hashing, custom tables `users`, `refresh_tokens`, `password_resets`, `email_confirmations`, `user_memberships` |
| Roles | `user_memberships.role` ∈ `admin`/`staff`/`participant`; `guest` = unauthenticated. Single hardcoded org (`src/lib/org.ts`, `ORG_ID` = Lyceum of Alabang) |
| PDF | `puppeteer-core` + `@sparticuz/chromium`, cached as base64 in `certificates.metadata.rendered_pdf` |
| Email | `nodemailer` (SMTP) + email templates; `certificate_emails` log |
| QR | `qrcode` package (data URLs) |
| Editors | TipTap (certificate + email templates) |
| Storage | Supabase Storage bucket `certificates` (file_path) |
| Env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_*`, `NEXT_PUBLIC_BASE_URL` (`src/lib/env.ts`) |

## 4.2 Surface Area (from `route-documentation.md`)

- ~30 web pages (auth, dashboard, participant, public)
- 2 auth route handlers (`/auth/confirm`, `/auth/callback`) — legacy OAuth/token confirm
- 11 `/api/*` route handlers
- ~75 server actions across `auth`, `users`, `attendees`, `events`, `certificates`, `templates`, `dashboard`, `organizations`, `audit`, `demo`
- 6 client-side `fetch()` calls
- `.well-known/workflow/*` + `/api/workflow-status` (async workflow runtime)

## 4.3 Schema (from `schema-documentation.md`)

| Group | Tables |
|-------|--------|
| Core domain (KEEP → Cert API) | `organizations`, `certificate_templates`, `events`, `certificates`, `event_attendees`, `certificate_emails`, `certificate_sequences`, `audit_logs` |
| Auth / identity (REMOVE) | `users`, `refresh_tokens`, `password_resets`, `email_confirmations`, `user_memberships` |

> The legacy schema doc already anticipated this refactor: it marks the auth tables for removal and flags `audit_logs.user_id` / `certificate_emails.sent_by` FKs to `users` as needing to become opaque provider `sub` values (the Cert data model in `api-endpoints.md` §7 already stores these as opaque TEXT without FK).

## 4.4 Auth Notes (from `src/lib`)

- `src/lib/auth/jwt.ts` signs **and** verifies its own HS256 tokens (secret in `src/lib/auth/config.ts`).
- `src/proxy.ts` verifies the `session` cookie, then does a **DB lookup** into `user_memberships` to derive the role, and injects `x-user-id/email/name/role` headers consumed by `src/lib/permissions.ts` (`getCurrentSession`, `requireRole`). CSRF + rate-limit live in the same proxy.
- `src/lib/permissions.ts` implements the 4-role capability checks (`canManageCertificates`, `canViewAuditTrail`, `getHomePathForRole`, …).

---

# 5. Locked Decisions

Locked with the user on 2026-08-05. These are normative for this spec.

| # | Decision | Detail |
|---|----------|--------|
| D1 | **Refactor the existing Next.js app** | Keep the existing UI/pages/components/editors; replace the auth + data-access layers. No greenfield frontend, no per-route strangler. |
| D2 | **Fresh start — no data migration** | Neither domain data nor identity migrates. `loa_cert` and `loa_auth` start empty. All users **re-register** on `auth.lyceumalabang.edu.ph`. Legacy `e-cert` data is not ported. |
| D3 | **Legacy DB: archive then drop** | Snapshot the Supabase DB (offline `pg_dump`) and retain the archive; decommission the tables/project **only after** cutover verification. |
| D4 | **bcrypt-hash porting: not applied** | Superseded by D2. Legacy bcrypt hashes are **not** reused. (If an admin ever provisions a legacy user manually, reusing the old hash is optional and out of scope.) |
| D5 | **Roles via Auth Platform user-groups + group permissions** | Legacy `admin`/`staff`/`participant` map to **user-groups** in `loa_auth`; each group is granted **endpoint levels** on the Cert catalog (`api-endpoints.md` §4.4). The `e-cert` UI resolves its role from the JWT `permissions` claim (level-based). |
| D6 | **PDF/QR/email owned by Cert Platform** | `e-cert` drops `puppeteer`, `qrcode`, `nodemailer`. PDFs/QRs/email are produced by Cert endpoints (DOMPDF per `PROJECT.md`). Frontend keeps TipTap for template **editing**; templates persist via the API. |
| D7 | **Spec location** | Authoritative copy in this repo (`assemblies/loa-cert-platform/legacy-e-cert-integration.md`); a synced working copy lives in the `e-cert` repo for the separate refactor. |
| ~~D8~~ | ~~SSR access-token cookie~~ | **Superseded 2026-08-06 (CSR decision).** The refactored `e-cert` is a **client-side SPA**: the access token lives **in memory only** (never an httpOnly cookie, never `localStorage`/`sessionStorage`), there are no server actions and no server-side JWT verification. The Cert API enforces a JWT model with app-level checks and does not adapt to front-end expectations; the front-end complies. This returns to `web-ui.md` §6.1 (in-memory-only); refresh stays in the Cert-proxied httpOnly `loa_cert_refresh` cookie. (Q-2 resolved 2026-08-06.) |

> D8 (superseded) rationale: the earlier SSR model mirrored the access token into an httpOnly `session` cookie because server components/server actions cannot read an in-memory token. The CSR decision removes the server-rendered layer entirely — no server components consume the token, so the mirror cookie is unnecessary complexity. All `~75` server actions are deleted and replaced by a client-side HTTP client; route protection is a client-side guard (UI only), not a security boundary.

| D9 | ~~**Cert API authentication deferred (2026-08-06)**~~ **Resolved 2026-08-11 — C-Auth complete.** `jwt.auth` + `jwt.endpoint` middleware enforced; SSO `callback`/`refresh`/`logout` live; 126 tests green. Phase D (e-cert auth swap) is unblocked. | |

---

# 6. Identity & SSO Integration

## 6.1 Removed Auth Surface

| Legacy artifact | Action |
|-----------------|--------|
| `src/lib/auth/password.ts`, `src/lib/auth/tokens.ts` | Delete (bcrypt, reset/confirm tokens no longer used) |
| `src/lib/auth/jwt.ts` | Rewrite to **parse-only** client-side claim extraction (§6.4); remove `signToken` **and** verification |
| `src/lib/auth/session.ts` | Rewrite to **in-memory token store** (§6.3); no `session` cookie, no `refresh` cookie (Cert handles refresh) |
| `src/lib/auth/config.ts` | Delete or reduce to the SSO callback path only |
| `src/app/(auth)/login`, `register`, `forgot-password`, `update-password` | Delete (Auth Platform owns these flows) |
| `src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts` | Delete (replaced by SSO fragment flow §6.2) |
| Auth server actions (`loginAction`, `register`, `forgotPassword`, `resetPassword`, `updatePassword`, `updateEmail`, `confirmEmail`, `requestPasswordChange`) | Delete |
| **All server actions** (`features/*/server/*.actions.ts`, ~75) | **Delete** — replaced by client-side API calls (`src/lib/api/*`, §8) |
| `src/proxy.ts` | **Delete** — no server-side auth injection, no server components to feed (CSR decision, D8 superseded) |
| `src/lib/supabase/*`, `src/lib/storage/*`, `src/lib/seed/*` | Delete (data access moves to Cert API; storage/seed are legacy-only) |
| `src/lib/permissions.ts` DB lookups | Rewrite to JWT-claims-only (keep capability functions) |
| `supabase/` (migrations, config, schema.sql) | Not used by the app; archived with D3 |

## 6.2 SSO Flow (adopts `api-endpoints.md` §9.2–9.3)

```
1. Unauthenticated user hits a protected page on e-cert.vercel.app
2. Auth guard redirects browser to
     https://auth.lyceumalabang.edu.ph/sso/login?redirect=https://e-cert.vercel.app
3. User authenticates on the Auth Platform
4. Auth Platform encrypts the token payload (AES-256-GCM) and redirects to
     https://e-cert.vercel.app#payload=<base64url_encrypted>
5. e-cert client-side code detects the fragment (only the client can read #),
   clears it via history.replaceState, and POSTs to the Cert callback
6. Cert `POST /api/v1/auth/callback` decrypts + validates (exp, tenant.slug=loa),
   sets httpOnly cookie `loa_cert_refresh` (Path=/api/v1/auth), returns the access token
7. e-cert stores the access token **in memory** (§6.3) and
   redirects to the intended destination
```

- The `redirect` origin must be in Auth `AUTH_ALLOWED_REDIRECTS` **and** the `loa` tenant's `redirect_origins` (Auth `web-ui.md`; `api-endpoints.md` §9.2).
- The callback request is made from the browser to the **same-origin** path `/api/v1/auth/callback`, which Vercel rewrites server-side to `cert-api.lyceumalabang.edu.ph` (§10.7), so the refresh cookie lands correctly.
- On callback failure: clear partial state, do **not** loop back to Auth (no redirect storm).

**Concrete SSO URLs (auth `web-ui.md` §4.1 — use `/sso/login`, not `/login`):**

| Purpose | URL |
|---------|-----|
| Sign-in (tenant flow) | `https://auth.lyceumalabang.edu.ph/sso/login?redirect=https://e-cert.vercel.app` |
| Registration | `https://auth.lyceumalabang.edu.ph/sso/register` (tenant-aware; no legacy `/register` page) |
| Forgot / reset password | `https://auth.lyceumalabang.edu.ph/forgot-password` / `https://auth.lyceumalabang.edu.ph/reset-password` |
| Callback target | `https://e-cert.vercel.app#payload=<encrypted>` (Auth redirects the browser here after the splash page) |

> `/login` is the **admin** login and rejects non-admin tenant logins; tenant apps must always point the guard at `/sso/login`. The `redirect` origin must resolve to an active `loa` tenant's `redirect_origins` — there is **no implicit fallback** (absent/invalid `redirect` is rejected).

Fragment detection (runs on every page load; only the client can read `#`):

```typescript
function hasSSOPayload(): boolean {
  return window.location.hash.startsWith("#payload=");
}
// On load: extract the fragment, clear it via history.replaceState,
// then POST { payload } to /api/v1/auth/callback (same-origin → Laravel Cert).
```

## 6.3 Session Handling (CSR, in-memory — supersedes D8)

| Concern | Design |
|---------|--------|
| Access token | **In-memory only** (JS module singleton). Never an httpOnly cookie, never `localStorage`/`sessionStorage` |
| Client API calls | In-memory access token attached as `Authorization: Bearer <access>` |
| Refresh | Client sees 401 → `POST /api/v1/auth/refresh` (same-origin via Vercel rewrite, `loa_cert_refresh` cookie sent automatically; `api-endpoints.md` §9.7) → new access token → update in-memory |
| Logout | `POST /api/v1/auth/logout` (clears `loa_cert_refresh`; `api-endpoints.md` §9.8) + drop in-memory token |
| Silent restore | On app load with a `loa_cert_refresh` cookie but no in-memory token (page refresh, new tab), the client performs a silent refresh to re-acquire an access token before the first API call |
| Route protection | Client-side auth guard (React layout wrapper) — redirect to SSO when no valid token; UI concern only, not a security boundary (§6.5) |

> The only persistent auth state is the Cert-proxied httpOnly `loa_cert_refresh` cookie (`Path=/api/v1/auth`, `SameSite=Lax`, 7 days), which JS cannot read and only Cert touches. This replaces the legacy dual-cookie (`session` + `refresh`) mechanism; the `session` cookie is **not** used.

## 6.4 Client-Side JWT Parsing Contract (`e-cert` browser)

**Parse, don't verify.** The Cert API verifies signatures and enforces authorization server-side. `e-cert` needs identity + coarse role only, for UI rendering.

1. Read the in-memory access token → else unauthenticated.
2. Base64url-decode the JWT payload (`atob(token.split(".")[1])`) — **no signature verification**.
3. Require `payload.type === "access"` → else invalid.
4. Require `payload.tenant.slug === "loa"` (matches `NEXT_PUBLIC_CERT_TENANT_SLUG`) → else tenant mismatch.
5. Read claims: `sub`, `email`, `name`, `groups`, `permissions` (array of `<level>:<path>`).
6. Derive the coarse UI role (§7.4) and expose a `SessionUser` (`id`, `email`, `name`, `role`) identical to today's `src/lib/permissions.ts` shape — so pages/components keep compiling.

**Access-token claim shape** (verified against Auth `app/Services/IdentityService.php` → `generateTokenPair` + `app/Services/JWTService.php`):

```json
{
  "sub": "<user-uuid>",
  "email": "user@example.com",
  "name": "Juan Dela Cruz",
  "groups": ["cert-staff"],
  "permissions": [
    "cert.certificates.issue",
    "read:/api/v1/events",
    "write:/api/v1/certificates"
  ],
  "scopes": [],
  "tenant": { "id": "<tenant-uuid>", "slug": "loa" },
  "iat": 1754000000,
  "exp": 1754000900,
  "type": "access"
}
```

- `permissions` mixes claim-policy keys (`cert.*`) with `<level>:<path>` endpoint grants; only the `<level>:<path>` entries drive role resolution (§7.4).
- `sub` is the Auth user UUID — the opaque identity that the **Cert API** stores as `created_by` on event/template create (`api-endpoints.md` §7.2); the client does not send it explicitly.
- The client never checks `exp` as a security control; it is used only to gate UI state until the next refresh.

**Parse-only implementation** (replaces the sign+verify pair in `src/lib/auth/jwt.ts`; `NEXT_PUBLIC_CERT_TENANT_SLUG` is the only env it needs):

```typescript
export function parseAccessToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.type !== "access") return null;
    if (payload.exp * 1000 < Date.now()) return null; // expired (UI-state gate)
    if (payload.tenant?.slug !== process.env.NEXT_PUBLIC_CERT_TENANT_SLUG) return null;
    return payload; // sub, email, name, groups, permissions, tenant, exp
  } catch {
    return null;
  }
}
```

Claims are valid for token lifetime; group/grant changes take effect at next issuance (`api-endpoints.md` §9.4 revocation caveat). No DB lookup and no signature verification anywhere on the client.

## 6.5 Auth Guard & Proxy (`src/proxy.ts`)

- **Delete `src/proxy.ts`.** No server-side auth injection, no `x-user-*` headers, no server components to feed (CSR decision, D8 superseded).
- **Client-side auth guard** (React layout wrapper, e.g. `src/lib/auth/auth-guard.tsx`):
  - On mount, read the in-memory token; if absent/expired (UI-level), redirect to `https://auth.lyceumalabang.edu.ph/sso/login?redirect=<current-origin>` (auth `web-ui.md` §4.1: `/login` is admin-only).
  - Wrap protected route groups (`/(dashboard)`, `/(participant)`) in the layout.
- CSRF and rate-limiting: the `Authorization: Bearer` header is not sent cross-origin by browsers, and `loa_cert_refresh` is `SameSite=Lax`; the **Cert API** owns rate limiting (`api-endpoints.md` §9.10). CSRF can be added at Vercel edge middleware if ever needed.
- `src/lib/permissions.ts` `getCurrentSession` reads claims from the in-memory token; the Supabase membership query is removed.

---

# 7. Roles & Grants via Auth Platform User-Groups

## 7.1 Model

Legacy roles are **not** a Cert-local concept and **not** a per-app enum. They are expressed as **user-groups in `loa_auth`** whose **endpoint grants (levels)** on the `loa` tenant's Cert catalog produce the JWT `permissions` claim (`tenant-group-endpoint-grants.md`, `group-permission-management.md`).

- Group membership + grants are managed in the Auth Platform (admin dashboard / `users.manage`).
- Cert enforces levels at runtime (`jwt.endpoint`, `api-endpoints.md` §9.5); the **frontend** derives a coarse role from the same claim for UI gating.
- `cert.*` permission keys remain *defined* in `group-permission-management.md` but are **not** consulted by Cert or `e-cert` for enforcement (`api-endpoints.md` §4.5). This section supersedes the `cert.*` key table in `web-ui.md` §5.1.

## 7.2 Cert Groups (expected on the `loa` tenant)

These are the user-groups the Cert Platform **expects** on the `loa` tenant. **Creating them in Auth is a side-note** — provisioned manually by an Auth operator per the Auth runbook `assemblies/loa-auth-platform/cert-readiness.md` (§6–§7). Per the 2026-08-06 decision they are **not** seeded: no `DatabaseSeeder.php` entry, nothing in `database/seeders/database.sql`.

| Group | Maps from legacy role | Grant pattern (`api-endpoints.md` §4.4) |
|------------|----------------------|----------------------------------------|
| `cert-admin` | `admin` | `admin` on every cataloged Cert path (Appendix A). Bypasses owner rule. |
| `cert-staff` | `staff` | `write` on management paths (events, attendees, templates, certificates issue/email), `read` on read paths, `read`/`write` on author-scoped item paths + `read` on `/me/events`, `/me/templates`. No grants on `admin` paths. |
| `cert-user` | `participant` | `read` on `/me/certificates`, `/me/certificates/{id}`, `/certificates/{id}`, `/{id}/pdf`, `/{id}/download`, `/events/{id}`, `/certificates/qr` (owner rule applies). |

- Group names confirmed (Q-4 resolved 2026-08-06): `cert-admin`, `cert-staff`, `cert-user`; existing LOA groups (Faculty, Students) are **not** reused.
- **Dashboard ownership (confirmed 2026-08-06):** `GET /api/v1/dashboard/stats` and `/api/v1/dashboard/activity` are **org-wide unscoped aggregates** (`api-endpoints.md` §5.7). Their `read` grants belong to `cert-admin` and `cert-staff` only; `cert-user` is **not** granted these paths (participants see only their own `/me/certificates`). The dashboard nav item renders for admin/staff roles only.
- Because D2 (fresh start), there is **no bulk role migration** — users register and are assigned to groups by an Auth admin. A public registration user lands in `cert-user` (or unassigned) by default; the Auth admin promotes staff/admin.

## 7.3 Who Decides Access

| Layer | Decides |
|-------|---------|
| Auth Platform | Group membership, per-group grants, user overrides, deny-wins (`tenant-group-endpoint-grants.md`); publishes `<level>:<path>` in JWT |
| Cert Platform | Whether the caller's granted level meets `required_level`, owner/author scope (§9.6) |
| e-cert UI | Only *display* gating (nav items, buttons, redirects) using the derived coarse role (§7.4) — never a security boundary |

## 7.4 Frontend Role Resolution (supersedes `web-ui.md` §5.2)

From the JWT `permissions` claim (level-based), derive the legacy `UserRole` used by the existing UI code:

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

> Same output type as legacy `resolveRoleFromPermissions` so `src/lib/permissions.ts` capability helpers (`canManageCertificates`, `canViewAuditTrail`, `getHomePathForRole`, …) continue to work unchanged. The existing page-level `requireRole` guards stay as-is; they now evaluate the JWT-derived role.

The client **may** additionally call `GET https://auth.lyceumalabang.edu.ph/api/v1/auth/access` (with the in-memory access token) to load the full resolved set for fine-grained UI gating, per `api-endpoints.md` §9.9. It is not required for the coarse role.

```typescript
// Optional fine-grained gating store — auth routes/api.php: GET /v1/auth/access (jwt.auth)
const res = await fetch(`${AUTH_BASE_URL}/api/v1/auth/access`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { user, groups, permissions, tenant } = await res.json(); // permissions = <level>:<path>
```

---

# 8. Cert Platform API Consumption

## 8.1 Data-Access Layer Replacement

All legacy data access (Supabase, repositories, server actions) is replaced by **client-side typed API modules** in `src/lib/api/`. There are no server actions, no server-side data fetching, no repositories.

| Legacy | Replacement |
|--------|-------------|
| `src/lib/supabase/*` (PostgREST clients, RLS reliance) | `src/lib/api/client.ts` — base HTTP client for the Cert API (same-origin `/api/v1/*` via the Vercel rewrite; §10.6): `Authorization: Bearer <in-memory>`, response envelope (§3.4), error normalization, 401→refresh→retry, multipart + binary support |
| `src/lib/repository/base.repository.ts` + `index.ts` | One typed module per resource in `src/lib/api/` (events, attendees, templates, certificates, dashboard, audit, verify/view), each wrapping `client.ts` with typed functions |
| **All server actions** (`features/*/server/*.actions.ts`, ~75) | **Delete.** Components call the typed API modules directly from the browser |
| JSONB `rendered_pdf` / `file_data` base64 payloads | Superseded by server-side storage in Cert (PDFs on disk/object store; `api-endpoints.md` §7) |
| RLS + `current_user_id()` | Server-side enforcement in Cert (level + scope rules); `e-cert` sends only the Bearer token |

Conventions to honor (from `api-endpoints.md` §3): response envelope `{ data | data+meta | status/error }`, `limit`/`offset` pagination, RFC 3339 timestamps, PDF binary streams, multipart certificate-file uploads, JSON bulk attendee import, synchronous bulk results `{ success, failed, errors }`.

## 8.2 Feature → Endpoint Mapping

Legend: `read`/`write`/`admin` = `required_level`; **REMOVE** = feature deleted; **AUTH** = owned by Auth Platform; **GAP** = not in Cert v1.2 (see §13).

> **CSR note:** every mapped server action below is **deleted** (not rewritten). The "New" column shows the Cert endpoint the UI now calls **directly from the browser** via `src/lib/api/` for that feature.

### Features — Auth (server actions deleted)

| Legacy action | New |
|---------------|-----|
| `loginAction`, `register`, `forgotPassword`, `requestPasswordChange`, `updatePassword`, `updateEmail`, `confirmEmail`, `resetPassword`, `getCurrentUser` | **AUTH** — delete; identity from JWT claims (§6.4) |
| `getSessionRoleAction` | Derived locally from `permissions` claim (§7.4) |

### Features — Users / Organizations / Demo (server actions deleted)

| Legacy action | New |
|---------------|-----|
| `listUsersAction`, `setUserRoleAction`, `banUserAction`, `unbanUserAction`, `deleteUserAction` | **AUTH** — delete; `/users` page removed |
| `createOrganizationAction`, `getMyOrganizationsAction`, `getOrganizationMembersAction`, `addMemberAction`, `removeMemberAction` | **REMOVE** — single org resolved from tenant claim (`api-endpoints.md` §3.3) |
| `setImpersonateUser`, `getImpersonateUserId`, `isDemoMode` | **REMOVE** — demo/impersonation excluded |

### Features — Events (server actions deleted)

| Legacy action | New Cert endpoint | Level |
|---------------|-------------------|-------|
| `getEventsAction`, `getEventsPaginatedAction` | `GET /api/v1/events` (search, status, limit, offset) | read |
| `getEventAction` | `GET /api/v1/events/{id}` | read |
| `getEventWithStatsAction` | `GET /api/v1/events/{id}/stats` | read |
| `createEventAction` | `POST /api/v1/events` | write |
| `updateEventAction` | `PATCH /api/v1/events/{id}` | write |
| `deleteEventAction` | `DELETE /api/v1/events/{id}` | write |
| `cloneTemplateForEventAction` | `POST /api/v1/events/{id}/clone-template` | write |
| `cloneEmailTemplateForEventAction` | `POST /api/v1/events/{id}/clone-email-template` | write |
| `issueEventCertificateAction` | `POST /api/v1/certificates` (with `event_id`) | write |
| `bulkIssueEventCertificatesAction` | `POST /api/v1/certificates/bulk` | write |

### Features — Attendees (server actions deleted)

| Legacy action | New Cert endpoint | Level |
|---------------|-------------------|-------|
| `getAttendeesAction` | `GET /api/v1/events/{id}/attendees` | read |
| `addAttendeeAction` | `POST /api/v1/events/{id}/attendees` | write |
| `bulkAddAttendeesAction` | `POST /api/v1/events/{id}/attendees/import` (**JSON payload** — same array shape the legacy client already sent; CSV parsing is a front-end concern) | write |
| `updateAttendeeAction` | `PATCH /api/v1/attendees/{id}` | write |
| `removeAttendeeAction` | `DELETE /api/v1/attendees/{id}` | write |
| `removeAttendeeWithCertAction` | `DELETE /api/v1/attendees/{id}/with-cert` | admin |
| `getAttendeeDeletePreviewAction` | `GET /api/v1/attendees/{id}/delete-preview` | read |
| `getAttendeeFileDataAction` | `GET /api/v1/attendees/{id}/file-data` | read |
| `issueCertificatesForCompletedAction` | `POST /api/v1/events/{id}/issue-completed` | write |
| `revokeExpiredForEventAction` | `POST /api/v1/events/{id}/revoke-expired` (count = `GET` variant) | admin |
| `reissueCertificatesForSelectedAction` | `POST /api/v1/events/{id}/reissue` | admin |

### Features — Certificates (server actions deleted)

| Legacy action | New Cert endpoint | Level |
|---------------|-------------------|-------|
| `issueCertificateAction` | `POST /api/v1/certificates` | write |
| `uploadCertificateFileAction` | `POST /api/v1/certificates/upload` (**multipart**, not base64) | write |
| `getCertificatesAction`, `getCertificatesWithEventAction` | `GET /api/v1/certificates` | read |
| `getCertificateAction` | `GET /api/v1/certificates/{id}` | read + owner |
| `revokeCertificateAction` | `POST /api/v1/certificates/{id}/revoke` | admin |
| `deleteCertificateAction` | `DELETE /api/v1/certificates/{id}` | admin |
| `sendCertificateEmailAction` | `POST /api/v1/certificates/{id}/email` | write |
| `getEmailLogsAction` | `GET /api/v1/certificates/{id}/email-logs` | read |
| `getAllEmailLogsAction` | **GAP** — no global email-logs endpoint in v1.2 |
| `getMyCertificatesAction` | `GET /api/v1/me/certificates` | read + owner |
| `getMyCertificateAction` | `GET /api/v1/me/certificates/{id}` | read + owner |
| `getCertificateQrCodeAction` | `GET /api/v1/certificates/qr` | read |

### Features — Templates (server actions deleted)

| Legacy action | New Cert endpoint | Level |
|---------------|-------------------|-------|
| `getTemplatesAction`, `getCertificateTemplatesAction` (+ lock state) | `GET /api/v1/templates?type=certificate` | read |
| `getEmailTemplatesAction` (+ lock state) | `GET /api/v1/templates?type=email` | read |
| `getAuthTemplatesAction`, `getAuthTemplateByProcessAction` | **AUTH** — delete (auth templates belong to Auth Platform) |
| `getTemplateAction`, `getEmailTemplateAction` | `GET /api/v1/templates/{id}` | read |
| `isTemplateLockedAction`, `isEmailTemplateLockedAction` | Lock state is a field on the template resource (no separate endpoint) |
| `createTemplateAction` | `POST /api/v1/templates` (`type=certificate`) | write |
| `createEmailTemplateAction` | `POST /api/v1/templates` (`type=email`) | write |
| `createAuthTemplateAction` | **AUTH** — delete |
| `updateTemplateAction` | `PATCH /api/v1/templates/{id}` (409 when referenced/locked) | write |
| `deleteTemplateAction` | `DELETE /api/v1/templates/{id}` (409 when referenced/locked) | write |

### Features — Dashboard & Audit (server actions deleted)

| Legacy action | New Cert endpoint | Level |
|---------------|-------------------|-------|
| `getDashboardStatsAction` | `GET /api/v1/dashboard/stats` | read |
| `getRecentActivityAction` | `GET /api/v1/dashboard/activity` | read |
| `getAuditLogsAction` | `GET /api/v1/admin/audit-logs` | admin |
| `getAuditLogsForExportAction` | `GET /api/v1/admin/audit-logs/export` | admin |
| `getEntityAuditLogsAction`, `getUserAuditLogsAction`, `getAuditLogsByIdsAction`, `deleteAuditLogsAction`, `deleteAllAuditLogsAction` | **GAP** — not in Cert v1.2 (drop UI or defer) |

### API Routes (`src/app/api/*` — all deleted)

| Legacy route | New |
|--------------|-----|
| `GET /api/verify/[number]` | `GET /api/v1/verify/{certificate_number}` (public) |
| `GET /api/certificates/[id]/view-data` | `GET /api/v1/view/{id}` (public) |
| `GET /api/certificates/[id]/pdf` | `GET /api/v1/certificates/{id}/pdf` |
| `GET /api/certificates/[id]/download` | `GET /api/v1/certificates/{id}/download` |
| `POST /api/certificates/[id]/save-pdf` | **REMOVE** — PDF generated server-side (DOMPDF) |
| `POST /api/certificates/expire` | `POST /api/v1/certificates/expire` (admin) — run by Cert scheduler; not necessarily called by the UI |
| `POST /api/events/[id]/bulk-issue` | `POST /api/v1/events/{id}/bulk-issue` (synchronous result) |
| `POST /api/events/[id]/reissue` | `POST /api/v1/events/{id}/reissue` |
| `GET|POST /api/events/[id]/revoke-expired` | `GET`/`POST /api/v1/events/{id}/revoke-expired` |
| `GET /api/workflow-status` | **REMOVE** — no async workflow runtime |
| `GET|POST /api/health` | **REMOVE** — admin master-reset excluded |
| `DELETE /api/storage/cleanup` | **REMOVE** — excluded by decision |
| `.well-known/workflow/*` | **REMOVE** — framework internals |

## 8.3 Client-Side Calls

| Legacy fetch | New |
|--------------|-----|
| `POST /api/events/[id]/bulk-issue` | `POST /api/v1/events/{id}/bulk-issue` |
| `GET|POST /api/events/[id]/revoke-expired` | `GET`/`POST /api/v1/events/{id}/revoke-expired` |
| `POST /api/events/[id]/reissue` | `POST /api/v1/events/{id}/reissue` |
| `POST /api/certificates/expire` | Remove (Cert scheduler) |
| `GET /api/verify/[number]` | `GET /api/v1/verify/{certificate_number}` |

All client fetches carry `Authorization: Bearer <in-memory access>`; on `401` the client performs the silent-refresh flow (§6.3) and retries once.

---

# 9. Frontend & Feature Changes

## 9.1 Pages That Stay (backed by Cert API)

| Page | Notes |
|------|-------|
| `/` landing | public |
| `/verify` + `/view/[id]` | public; call `/api/v1/verify/{number}` and `/api/v1/view/{id}` |
| `/(dashboard)/dashboard` | stats + activity |
| `/(dashboard)/events*` (list, new, `[id]`, upload, issue) | attendance bulk import is a JSON payload; CSV parsing stays client-side |
| `/(dashboard)/certificates*` (list, issue, `[id]`) | PDF/QR/email via API |
| `/(dashboard)/templates/certificates*` | TipTap persists via `POST/PATCH /api/v1/templates` |
| `/(dashboard)/templates/emails*` | same, `type=email` |
| `/(dashboard)/audit` | `admin` endpoints |
| `/(participant)/my`, `my/certificates*` | `/me/certificates*` |

## 9.2 Pages That Are Removed

| Page | Reason |
|------|--------|
| `/(auth)/login`, `register`, `forgot-password`, `update-password` | Auth Platform owns auth UI |
| `/(dashboard)/users` | Auth Platform owns user management |
| `/(dashboard)/templates/auth-emails*` | Auth email templates belong to Auth Platform |
| `/(participant)/my/profile` (email update) | Email/identity managed by Auth Platform (Q-5 resolved 2026-08-06: out of scope — noted as a refinement task, likely front-end) |

## 9.3 Components / Modules

- **Keep:** TipTap editors (certificate/email), base UI components, verify/view renderers (re-sourced from API responses), dashboard/event/certificate components.
- **Adapt:** PDF preview/download buttons → Cert PDF endpoints; QR display → `/api/v1/certificates/qr`; CSV upload → parse client-side then `POST` JSON to `/attendees/import`; event/certificate detail → envelope-shaped responses.
- **Remove:** `src/lib/pdf/`, `src/lib/email/`, `src/lib/qr/`, `src/lib/supabase/`, `src/lib/storage/`, `src/lib/seed/`, `src/features/auth/` (UI), `src/features/users/`, `src/features/organizations/`, `src/features/demo/`.
- **Add:** typed Cert API client modules (§8.1), SSO fragment handler, in-memory token store + silent-refresh wiring (§6.3), client-side auth guard (§6.5).

## 9.4 Feature Semantics Changes

| Legacy behavior | New behavior |
|-----------------|--------------|
| Async workflow for issue/reissue (`/api/workflow-status`) | **Synchronous** bulk results (`api-endpoints.md` §3.8) — UI shows per-item success/failed, no polling |
| Client-side PDF render + `save-pdf` (puppeteer, base64 cache) | PDF generated/streamed by Cert (DOMPDF); frontend only fetches/downloads |
| Auth email templates & SMTP in the app | Email templates + sending live in Cert; `e-cert` no longer holds SMTP creds |
| `organization_id` in every action | Omitted; org resolved from JWT `tenant.slug` |
| Local `user_memberships` role lookup (proxy + fallback) | JWT `permissions` claim parsed client-side → role (§7.4); no proxy, no DB lookup |
| Login-gated download (`admin/staff OR recipient email`) | Cert owner rule + level (`read` + recipient scope, §9.6) |

---

# 10. Environment & Deployment

## 10.1 Env Contract for `e-cert` (`src/lib/env.ts`)

| Variable | Status | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_BASE_URL` | keep | `https://e-cert.vercel.app` (Vercel deployment origin; canonical UI origin) |
| `AUTH_BASE_URL` | add | `https://auth.lyceumalabang.edu.ph` (SSO login redirect) |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | add | `loa` (validated against token `tenant.slug` in §6.4; also used by `e-cert/specs` env docs) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | remove | no DB access |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | remove | email owned by Cert |
| Legacy `authConfig.jwtSecret` (local signing secret) | remove | tokens are parsed client-side, never verified/signed (§6.4) |

> `e-cert` does **not** need `ENCRYPTION_KEY`/`ENCRYPTION_KEY_PREVIOUS` — SSO payload decryption happens in Cert (`api-endpoints.md` §9.3). There is **no `JWT_SECRET` anywhere in e-cert** — no shared secret, no `CERT_ACCESS_COOKIE`, no `CERT_API_BASE_URL` (the browser only ever calls the same-origin `/api/v1` rewrite, §10.7).

## 10.2 Auth Platform Configuration (prereq)

> **Side-note — how Auth is provisioned:** the Auth-side work (creating the `loa` tenant, importing the Cert catalog, creating the Cert groups, applying the grants, setting allowlists) is **owned by Auth** and is an operator-run procedure — see the Auth runbook **`assemblies/loa-auth-platform/cert-readiness.md`** (§4–§7 production, §8 local Docker). It is **not** baked into Auth seeders (2026-08-06 decision). This spec only records what the Cert Platform **depends on**:

- The `loa` tenant exists (active) with `redirect_origins` = `https://e-cert.vercel.app` (SSO redirect target).
- The Cert endpoint catalog (Appendix A of `api-endpoints.md`) is present on that tenant.
- `cert-admin` / `cert-staff` / `cert-user` groups exist with the §7.2 grants.
- `JWT_SECRET` identical across Auth and Cert only (`assemblies/loa-auth-platform/environment.md`); **not** present in `e-cert`.

> These dependencies matter once the **C-Auth** phase (D9) implements the Cert-side consumers; Phase C's domain CRUD runs without them.

## 10.3 Topology (Q-1 — resolved: split origin)

The e-cert UI is deployed to Vercel (`e-cert.vercel.app`); the Laravel Cert API is a dedicated API host at `cert-api.lyceumalabang.edu.ph`.

- **Recommended:** the Next.js app adds a Vercel rewrite (`/api/v1/:path*` → `https://cert-api.lyceumalabang.edu.ph/api/v1/:path*`, §10.7) so the browser stays same-origin — the `loa_cert_refresh` cookie (`Path=/api/v1/auth`) keeps working and no CORS is needed.
- **Fallback:** direct cross-origin calls with `credentials`; then the Cert API must enable CORS for `https://e-cert.vercel.app` and the refresh cookie must be `SameSite=None; Secure` (`services/cors/README.md`).

## 10.4 Auth Platform Wiring (concrete)

The concrete provisioning steps (tenant creation, catalog import, group creation, grants, `.env` allowlists) are the **Auth runbook's** job — `assemblies/loa-auth-platform/cert-readiness.md` §4–§7 (production) and §8 (local Docker) — performed manually by an Auth operator, **not** this spec. Only the **e-cert-facing contracts** are recorded here:

| Item | Where | Value / Contract |
|------|-------|------------------|
| Shared `JWT_SECRET` | Auth `.env` `JWT_SECRET` — must equal Cert; **not** needed by e-cert | random 32+ chars, e.g. `openssl rand -base64 48`; never commit (auth `environment.md`) |
| `ENCRYPTION_KEY` | Auth `.env` (shared with Cert **only**, not e-cert) | 32 bytes hex-encoded (auth `web-ui.md` §4.1) |
| Redirect allowlist | must include `https://e-cert.vercel.app` | applied in Auth (`.env` `AUTH_ALLOWED_REDIRECTS` + `loa` tenant `redirect_origins`); no implicit fallback |

> The Cert-side consumers of this wiring (SSO `callback`/`refresh`/`logout` + `jwt.auth`/`jwt.endpoint` middleware) are deferred to the **C-Auth** phase (D9, 2026-08-06).

## 10.5 Access-Token Claim Contract (e-cert parse-only)

| Aspect | Contract |
|--------|----------|
| Shared | No shared secret with e-cert. Auth and Cert share `JWT_SECRET` (HS256) for issue + verify; e-cert never sees it (§6.4) |
| Direction | e-cert is **parse-only** — decodes the base64url payload to read identity/role claims; never verifies, never signs, never issues tokens |
| Algorithms | HS256 (Auth/Cert side only) |
| Must-check claims | `type=access`, `tenant.slug=loa` (§6.4); `exp` used only for UI state |
| TTLs | access 15 min (`JWT_ACCESS_TTL=15`), refresh 7 days (`JWT_REFRESH_TTL=10080`) |
| `permissions` claim | array mixing `cert.*` keys + `<level>:<path>` entries; only levels are used for gating (§7.4) |
| `tenant` claim | `{ id, slug }`; slug must equal `NEXT_PUBLIC_CERT_TENANT_SLUG` |

## 10.6 Consuming the Cert API (concrete)

- Browser base URL (same-origin): `https://e-cert.vercel.app/api/v1` — i.e. `NEXT_PUBLIC_BASE_URL + "/api/v1"`, rewritten server-side to `https://cert-api.lyceumalabang.edu.ph/api/v1` (§10.7). All calls originate from the browser; there are no server-side calls.
- Auth header on every non-public call: `Authorization: Bearer <access>`.
- Success envelope: `{ "data": ... }` or `{ "data": [...], "meta": { limit, offset, total, has_more } }`; errors: `{ "status": "error", "message": ..., "errors": {...} }` (`api-endpoints.md` §3.4).
- `401` → silent refresh (§6.3) → retry once. `403` → genuine lack of permission — do **not** refresh/retry.
- PDFs are binary streams (`Content-Type: application/pdf`); never base64 in JSON. Certificate file uploads are `multipart/form-data`; bulk attendee import is a JSON payload (§8.2).
- Bulk results are synchronous: `{ "success": n, "failed": n, "errors": [...] }` (§3.8).

```typescript
// Example: list events (client API module)
const res = await fetch(`${BASE}/events?limit=25&offset=0`, {
  headers: { Authorization: `Bearer ${getAccessToken()}` },
});
if (res.status === 401) { const ok = await silentRefresh(); if (!ok) return null; return retry(); }
if (!res.ok) throw await res.json();
const { data, meta } = await res.json();
```

## 10.7 Topology Wiring (Vercel rewrites + Cert API host)

**Primary — browser same-origin via a Vercel rewrite** (`next.config.js`):

```js
// next.config.js
async rewrites() {
  return [{
    source: "/api/v1/:path*",
    destination: "https://cert-api.lyceumalabang.edu.ph/api/v1/:path*",
  }];
}
```

- The rewrite is server-side: the browser only ever talks to `https://e-cert.vercel.app`. Set-Cookie from the Cert API (the `loa_cert_refresh` cookie, `Path=/api/v1/auth`, HttpOnly) is relayed to the browser, so the cookie model in §6.3 is unchanged.
- The access token is held **in memory only** — no `session` cookie is set by the UI or by Next.js.
- PDF binary streams and multipart certificate-file uploads pass through the rewrite; if a Vercel time/streaming limit is hit for a route, fall back to a direct cross-origin call to `cert-api.lyceumalabang.edu.ph` for that route (then the Cert API must apply `services/cors`).

**Cert API host (Laravel)** — served by its own web server (cPanel/Apache distro in `loa-apache-server-apps`):

```apache
<VirtualHost *:443>
    ServerName cert-api.lyceumalabang.edu.ph
    DocumentRoot /home/user/loa-cert-platform/public
    # Laravel via public/.htaccess (mod_rewrite); TLS cert for the subdomain.
    # APP_URL=https://cert-api.lyceumalabang.edu.ph
    # CORS_ALLOWED_ORIGINS=https://e-cert.vercel.app  (only needed for direct cross-origin calls)
</VirtualHost>
```

- `loa_cert_refresh` (`Path=/api/v1/auth`, HttpOnly) is set by Laravel on `/api/v1/auth/*` responses and reaches the browser through the Vercel rewrite.
- If direct cross-origin calls are used instead of the rewrite, the refresh cookie must be `SameSite=None; Secure` and the Cert API must allow `https://e-cert.vercel.app` in `CORS_ALLOWED_ORIGINS`.

## 10.8 File-by-File Retrofit Checklist (`e-cert`)

| Path | Change |
|------|--------|
| `src/lib/env.ts` | New schema per §10.1 (add `AUTH_BASE_URL`, `NEXT_PUBLIC_CERT_TENANT_SLUG`; drop Supabase/SMTP vars) |
| `src/lib/auth/jwt.ts` | Parse-only (§6.4); delete `signToken` and verification |
| `src/lib/auth/session.ts` | In-memory token store (§6.3); delete cookies |
| `src/lib/auth/password.ts`, `tokens.ts` | Delete |
| `src/lib/auth/config.ts` | Delete (SSO callback path inlined in the fragment handler) |
| `src/proxy.ts` | **Delete** (D8 superseded — CSR decision 2026-08-06; no server-side auth injection) |
| `src/lib/permissions.ts` | JWT-claims-only role (§7.4); keep capability helpers |
| `src/lib/supabase/*`, `src/lib/storage/*`, `src/lib/seed/*` | Delete |
| `src/lib/repository/*` | Replace with client API modules per resource (§8.1, §10.6) |
| `src/lib/pdf/*`, `src/lib/email/*`, `src/lib/qr/*` | Delete (Cert owns PDF/QR/email) |
| `src/features/auth`, `users`, `organizations`, `demo` | Delete |
| `src/app/(auth)/*` | Delete |
| `src/app/auth/confirm`, `auth/callback` | Delete; add SSO fragment handler (§6.2) |
| Server actions (`features/*/server/*.actions.ts`) | **Delete all**; components call `src/lib/api/*` directly (§8.2) |
| `src/app/(dashboard)/users` | Delete |
| `src/app/(dashboard)/templates/auth-emails*` | Delete |
| `src/app/(participant)/my/profile` | Delete (Q-5 resolved 2026-08-06: out of scope; refinement task, likely front-end) |
| `.env*` | Replace per §10.1 |
| `package.json` | Remove `@supabase/*`, `puppeteer-core`, `@sparticuz/chromium`, `nodemailer`, `bcryptjs`, `qrcode`, `jose` |

---

# 11. Legacy Decommissioning

Ordered, all after cutover is verified (D3):

1. **Archive:** offline `pg_dump` of the Supabase DB (schema + data) to durable storage; note credentials/URLs. Keep the archive indefinitely (read-only reference).
2. **Freeze:** stop legacy writes; confirm the app is fully on Cert API (no server actions still hitting PostgREST — code-level removal guarantees this).
3. **Verify:** spot-check parity — a user who can log in via Auth, an event, issued cert, PDF download, verify, view, audit entry (see §12 Phase F).
4. **Drop:** remove legacy tables in dependency order (`refresh_tokens`, `password_resets`, `email_confirmations`, `user_memberships`, `users`, then domain tables) or decommission the Supabase project entirely. Remove `supabase/` and legacy env vars from the repo.
5. **Retire deps:** remove `@supabase/*`, `puppeteer-core`, `@sparticuz/chromium`, `nodemailer`, `bcryptjs`, `qrcode` from `package.json`.

> Because D2 (fresh start), no ETL mapping is specified. If a future decision reverses D2, the mapping basis is `schema-documentation.md` (Postgres → MySQL adaptations in `api-endpoints.md` §7).

---

# 12. Implementation Plan

Spec-gated (AI-RULES.md Rule 0). Each phase requires the governing spec to be Final.

| Phase | Work | Gate |
|-------|------|------|
| **A** | ✅ **Complete 2026-08-06** — `api-endpoints.md` v1.3 and this spec v2.0 promoted to **Final** | user review |
| **B** | Auth readiness — provisioned **manually at deploy-time** per the Auth runbook `cert-readiness.md` (§10.2 side-note) | Auth runbook `cert-readiness.md` Final |
| **C** | ✅ **Complete 2026-08-10** — Cert scaffold: domain CRUD slice — events / attendees / templates / certificates + tests | `api-endpoints.md` Final |
| **C-Auth** | ✅ **Complete 2026-08-11** — `jwt.auth` + `jwt.endpoint` middleware and SSO `callback` / `refresh` / `logout` (§9). 126 tests, 386 assertions, all green. | prerequisite of Phase D |
| **D** | `e-cert` auth swap (CSR): env, in-memory token store + silent refresh, SSO fragment handler, parse-only JWT, client auth guard, delete `src/proxy.ts` + auth pages/actions | this spec Final + **C-Auth** done ✅ |
| **E** | `e-cert` data swap: typed client API modules (§8.1), delete all server actions, components call endpoints directly (§8.2), PDF/QR/email/upload via API, remove legacy modules | this spec Final |
| **F** | UI cleanup + verification: removed pages/components, silent refresh, parity checks (login, event, issue, download, verify, view, audit) | — |
| **G** | Decommission legacy DB + deps (§11) | cutover verified |
| **H** | Phase 4 integration: cross-app JWT validation tests, OpenAPI, audit consistency (`PROJECT.md` Phase 4) | — |

Suggested first implementation slice (core-first): events + attendees + templates + certificates against the Cert API (**unauthenticated** — D9); SSO/session and the auth middleware follow in the **C-Auth** phase; PDF/QR/email/audit/dashboard afterwards.

---

# 13. Risks & Open Questions

| ID | Question / Risk | Impact |
|----|-----------------|--------|
| Q-1 | ~~Confirm single-origin topology~~ **Resolved 2026-08-05**: UI on Vercel (`e-cert.vercel.app`), Cert API on `cert-api.lyceumalabang.edu.ph`. Decide rewrite-vs-CORS for `/api/v1` (rewrite recommended, §10.7) | Cookie scope + CORS + env vars |
| Q-2 | ~~Confirm D8: access token mirrored into an httpOnly `session` cookie for SSR~~ **Resolved 2026-08-06 (CSR)**: D8 superseded — `e-cert` is a **client-side SPA**; the Cert API enforces its JWT model with app-level checks and does not adapt to front-end expectations. No shared secret, no server actions, no `session` cookie, no proxy; token held in memory, refresh via `loa_cert_refresh`, route guard is client-side only (§6, §5) | Security posture vs. SSR capability |
| Q-3 | ~~Audit-log delete + entity/user/by-ids queries + global email logs not in Cert v1.2 — drop UI or extend API?~~ **Resolved 2026-08-06**: deferred — drop the affected UI features from the retrofit; a dedicated SMTP API endpoint will come later (check reuse of Auth's temporary email tool); not blocking v1.2 | Scope of Cert API v1.2 |
| Q-4 | ~~Confirm seed group names (`loa-cert-admin/staff/participant`) vs. reuse of LOA groups~~ **Resolved 2026-08-06**: `cert-admin` / `cert-staff` / `cert-user`; no reuse of existing LOA groups | Auth seeding |
| Q-5 | ~~`/my/profile` (email update) removed — confirm participant profile out of `e-cert` scope~~ **Resolved 2026-08-06**: out of scope; noted as a refinement task (likely front-end) | UI scope |
| Q-6 | ~~Certificate-number default pattern `LOA-YYYY-####`~~ **Resolved 2026-08-06**: `certificate_number_pattern` is user-configurable per event and required, must contain `####` to produce an incremental id (e.g. `CERT-####`, `TEMP-001-####`, `CERT-####-2026`); no fixed default (synced to `api-endpoints.md` §5.1/§7.4) | Data defaults |
| Q-7 | ~~CSV import replaces legacy JSON bulk-add for attendees~~ **Resolved 2026-08-06**: `/attendees/import` accepts a **JSON payload**; CSV parsing / upload wizard is a front-end concern (synced to `api-endpoints.md` §5.2) | Attendee import UX |
| R-1 | Stale `permissions` for token lifetime — users see old UI role until next login/refresh (mitigated by token TTL 15 min) | Role freshness |
| R-2 | In-memory token lost on full page load / new tab — mitigated by silent refresh on app load (re-acquires an access token from the `loa_cert_refresh` cookie before the first API call, §6.3) | Session reliability |
| R-3 | CORS avoided by the Vercel `/api` rewrite; if direct cross-origin calls are ever used, `services/cors` must be applied on the Cert API (and Auth, for `/access`) | Topology |
| R-4 | XSS at the SPA can read the in-memory token (no HttpOnly protection) — mitigated by no-token-in-storage, short TTL (15 min), and Cert-side enforcement as the real boundary | Security posture |

---

# 14. References

| Spec / doc | Role |
|------------|------|
| `assemblies/loa-cert-platform/api-endpoints.md` (Final v1.5) | Cert API source of truth; §4 levels, §6 routes, §7 data model, §9 SSO/JWT/permissions, Appendix A catalog |
| `assemblies/loa-cert-platform/authenticated-endpoints-spec.md` (v1.1) | Endpoint reference card with required levels |
| `assemblies/loa-cert-platform/README.md` (v1.2) | Assembly scope, §11 SSO contract, §10 REST conventions |
| `assemblies/loa-auth-platform/tenant-group-endpoint-grants.md` (Final v1.1) | Level-based grants model (authority for levels) |
| `assemblies/loa-auth-platform/group-permission-management.md` (Final v2.0) | User-groups + permission definitions (`cert.*` defined, not enforced) |
| `assemblies/loa-auth-platform/tenant-endpoint-catalog.md` | Cert catalog + `/auth/access` resolution |
| `assemblies/loa-auth-platform/web-ui.md` (v1.2) | Auth SSO flow, `#payload=` contract, `AUTH_ALLOWED_REDIRECTS` |
| `assemblies/loa-auth-platform/environment.md` | Shared `JWT_SECRET` requirements |
| `PROJECT.md` | Phase 3 (Cert App) + Phase 4 (Integration) status; Cert = Laravel 12 / `loa_cert` |
| `e-cert/route-documentation.md`, `schema-documentation.md`, `API_Endpoints_Documentation.md` | Legacy surface + schema inventory (this spec §4) |
| `AI-RULES.md` / `AI-GUIDE.md` | Spec-first rule (no code until Final) |

---

## Document Control

- **Status:** Final v2.2 — 2026-08-11: **C-Auth complete** (§12 C-Auth row marked done; Phase D unblocked). v2.1 (2026-08-06): D9 — Cert API authentication deferred. v2.0 (2026-08-06): CSR rewrite, D8 superseded; Q-2..Q-7 resolved; Q-17 proxy + dashboard ownership confirmed.
- **Authoritative source:** `loa-apache-server-apps/assemblies/loa-cert-platform/legacy-e-cert-integration.md`.
- **Synced working copy:** `D:\loa\e-cert\legacy-e-cert-integration.md` (same content; refactor drives from the `e-cert` copy).
