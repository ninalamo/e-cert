# LOA Cert Platform — Legacy `e-cert` Integration & Refactor
## Product Assembly Component Specification

**Version:** 1.0
**Status:** Draft
**Layer:** Product Assembly (`loa-cert-platform`)
**Audience:** Architects, Engineers, AI Development Agents

> **Purpose.** This spec designs the refactor of the legacy `e-cert` application (Next.js 16 / TypeScript, self-hosted auth + Supabase Postgres) into a **pure consumer** of the LOA Auth Platform (`loa-auth-platform`; identity, SSO, JWT, user-groups + grants) and the LOA Cert Platform (`loa-cert-platform`; domain API v1.2, PDF/QR/email). It is the "later pass" referenced by `api-endpoints.md` §9.9 that replaces the `cert.*`-key permission table in `web-ui.md` §5 with the level-based model, and it adapts the SSO token-lifecycle spec to a server-rendered Next.js app.
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
| Feature mapping | Legacy server actions + API routes mapped to Cert endpoints; removed features enumerated |
| Frontend | Auth guard, session/token handling for an SSR app, pages to keep/remove, editor persistence |
| Env / deploy | New env contract for `e-cert`, origins/topology (`e-cert.vercel.app` UI + `cert-api.lyceumalabang.edu.ph` API), shared secrets |
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
   Browser          │  e-cert.vercel.app  (Next.js 16, e-cert UI) │
                    │  - SSO fragment handling (#payload=)         │
                    │  - SSR auth guard (local JWT verify)         │
                    │  - TipTap editors, pages, components         │
                    │  - HTTP client → Cert API v1.2               │
                    └───────┬──────────────────────┬───────────────┘
                            │ SSO redirect         │ HTTPS JSON/multipart/binary
                            ▼                      ▼
             ┌─────────────────────────────┐  ┌──────────────────────────────┐
             │  auth.lyceumalabang.edu.ph  │  │  cert-api.lyceumalabang.edu.ph │
             │  (Laravel, loa_auth)        │  │  (Laravel, loa_cert)          │
             │  login / SSO / JWT          │  │  jwt.auth + jwt.endpoint      │
             │  user-groups + grants       │  │  domain endpoints (§8)        │
             │  GET /api/v1/auth/access    │  │  PDF / QR / email / audit     │
             └─────────────────────────────┘  └──────────────────────────────┘
```

Key properties:

1. **No DB access from the frontend.** `e-cert` removes every Supabase/PostgREST import. All domain reads/writes go through the Cert API; identity comes only from the JWT.
2. **No local identity.** `e-cert` no longer signs tokens, stores password hashes, or reads a users table. Identity is the Auth Platform's access token (claims: `sub`, `email`, `name`, `tenant`, `groups`, `permissions`).
3. **Shared secrets.** `JWT_SECRET` (HS256) is shared by Auth, Cert, and `e-cert` for *local verification*. `ENCRYPTION_KEY` / `ENCRYPTION_KEY_PREVIOUS` are shared by Auth (encrypt) and Cert (decrypt). `e-cert` never encrypts/decrypts the SSO payload — it forwards it to the Cert callback (`api-endpoints.md` §9.2–9.3).
4. **Split origin.** The e-cert UI runs on Vercel (`e-cert.vercel.app`); the Laravel Cert API is a dedicated API host at `cert-api.lyceumalabang.edu.ph`. The Next.js app proxies `/api/v1/*` to the Cert API via Vercel rewrites (§10.7), keeping the browser same-origin so the httpOnly refresh cookie keeps working; direct cross-origin with CORS is the fallback. (Q-1 resolved, §13.)
5. **Level-based authorization.** The Cert platform enforces `<level>:<path>` grants (`api-endpoints.md` §4, §9.5). The frontend derives a coarse UI role from the same `permissions` claim for nav/gating (§7.4).

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
| D8 | **SSR access-token cookie** | Because `e-cert` is server-rendered (RSC + Server Actions), the access token is additionally mirrored into an httpOnly cookie (`session`, TTL = token `exp`) for SSR verification, alongside the in-memory copy used for `Authorization: Bearer` on API calls. This **refines** `web-ui.md` §6.1 (in-memory-only) for the SSR case; refresh stays in the Cert-proxied httpOnly cookie. Never `localStorage`/`sessionStorage`. (Open question Q-2.) |

> D8 rationale: `web-ui.md` §6.1 stores the access token in memory only, which is fine for a client-rendered SPA. Next.js server components and server actions cannot read an in-memory token. The httpOnly access cookie is short-lived (15 min), server-verifiable with the shared `JWT_SECRET`, and never readable by JS — the refresh token remains in its own httpOnly cookie handled entirely by Cert's proxied endpoints.

---

# 6. Identity & SSO Integration

## 6.1 Removed Auth Surface

| Legacy artifact | Action |
|-----------------|--------|
| `src/lib/auth/password.ts`, `src/lib/auth/tokens.ts` | Delete (bcrypt, reset/confirm tokens no longer used) |
| `src/lib/auth/jwt.ts` | Rewrite to **verify-only** Auth Platform tokens (§6.4); remove `signToken` |
| `src/lib/auth/session.ts` | Keep shape; `session` cookie now holds the Auth **access token**; `refresh` cookie usage removed (Cert handles refresh) |
| `src/lib/auth/config.ts` | Reduce to cookie name/options; remove local signing secret |
| `src/app/(auth)/login`, `register`, `forgot-password`, `update-password` | Delete (Auth Platform owns these flows) |
| `src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts` | Delete (replaced by SSO fragment flow §6.2) |
| Auth server actions (`loginAction`, `register`, `forgotPassword`, `resetPassword`, `updatePassword`, `updateEmail`, `confirmEmail`, `requestPasswordChange`) | Delete |
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
7. e-cert sets its own httpOnly `session` cookie = access token (§6.3) and
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

## 6.3 SSR Session Handling (Decision D8)

| Concern | Design |
|---------|--------|
| `session` cookie | `HttpOnly; Secure; SameSite=Lax; Path=/`; value = Auth access token; `maxAge` = token `expires_in` (15 min) |
| SSR reads | Server components / server actions verify the cookie locally with the shared `JWT_SECRET` (§6.4) |
| Client API calls | In-memory access token attached as `Authorization: Bearer <access>` |
| Refresh | Client sees 401 → `POST /api/v1/auth/refresh` (same-origin, cookie-driven; `api-endpoints.md` §9.7) → new access token → update in-memory + rewrite `session` cookie via a tiny Next.js route handler (server-only, httpOnly) |
| Logout | `POST /api/v1/auth/logout` (clears `loa_cert_refresh`; `api-endpoints.md` §9.8) + clear `session` cookie + drop in-memory token |
| Silent restore | On app load with a `session` cookie but no in-memory token, the client performs a silent refresh to re-acquire an access token before the first API call |

> This replaces the legacy dual-cookie (`session` + `refresh`) mechanism. The `refresh` cookie in `src/lib/auth/session.ts` is removed; refresh becomes Cert-proxied.

## 6.4 Local JWT Verification Contract (`e-cert` server side)

Mirror of `api-endpoints.md` §9.4, minus the catalog enforcement (that is Cert's job). `e-cert` needs identity + coarse role only.

1. Extract the `session` cookie → else unauthenticated.
2. `jose.jwtVerify(token, sharedJWTSecret, { algorithms: ["HS256"] })` → signature + `exp` → else invalid.
3. Require `payload.type === "access"` → else invalid.
4. Require `payload.tenant.slug === "loa"` (matches `CERT_TENANT_SLUG`) → else tenant mismatch.
5. Read claims: `sub`, `email`, `name`, `groups`, `permissions` (array of `<level>:<path>`).
6. Derive the coarse UI role (§7.4) and expose a `SessionUser` (`id`, `email`, `name`, `role`) identical to today's `src/lib/permissions.ts` shape — so pages/actions keep compiling.

**Access-token claim shape** (verified against Auth `app/Services/IdentityService.php` → `generateTokenPair` + `app/Services/JWTService.php`):

```json
{
  "sub": "<user-uuid>",
  "email": "user@example.com",
  "name": "Juan Dela Cruz",
  "groups": ["loa-cert-staff"],
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
- `sub` is the Auth user UUID — the opaque identity to send as `created_by` on event/template create (`api-endpoints.md` §7.2).

**Verify-only implementation** (replaces the sign+verify pair in `src/lib/auth/jwt.ts`; `JWT_SECRET` comes from env, never committed):

```typescript
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.type !== "access") return null;
    if (payload.tenant?.slug !== process.env.CERT_TENANT_SLUG) return null;
    return payload; // sub, email, name, groups, permissions, tenant
  } catch {
    return null;
  }
}
```

Claims are valid for token lifetime; group/grant changes take effect at next issuance (`api-endpoints.md` §9.4 revocation caveat). No DB lookup anywhere.

## 6.5 Auth Guard & Proxy (`src/proxy.ts`)

- Keep: CSRF origin check, IP rate limiting, public-path handling.
- Change: replace the `user_memberships` DB lookup with local JWT verification of the `session` cookie (§6.4). Set `x-user-id`, `x-user-email`, `x-user-name`, `x-user-role` headers from claims + derived role (keeps `src/lib/permissions.ts` fast-path working unchanged).
- Change: redirect rule — unauthenticated users on protected routes go to `https://auth.lyceumalabang.edu.ph/sso/login?redirect=<current-origin>` (auth `web-ui.md` §4.1: `/login` is admin-only).
- `getCurrentSession` fallback path (server actions) also verifies the cookie locally; the Supabase membership query is removed.

---

# 7. Roles & Grants via Auth Platform User-Groups

## 7.1 Model

Legacy roles are **not** a Cert-local concept and **not** a per-app enum. They are expressed as **user-groups in `loa_auth`** whose **endpoint grants (levels)** on the `loa` tenant's Cert catalog produce the JWT `permissions` claim (`tenant-group-endpoint-grants.md`, `group-permission-management.md`).

- Group membership + grants are managed in the Auth Platform (admin dashboard / `users.manage`).
- Cert enforces levels at runtime (`jwt.endpoint`, `api-endpoints.md` §9.5); the **frontend** derives a coarse role from the same claim for UI gating.
- `cert.*` permission keys remain *defined* in `group-permission-management.md` but are **not** consulted by Cert or `e-cert` for enforcement (`api-endpoints.md` §4.5). This section supersedes the `cert.*` key table in `web-ui.md` §5.1.

## 7.2 Seed Groups (proposed, `loa` tenant)

| Seed group | Maps from legacy role | Grant pattern (`api-endpoints.md` §4.4) |
|------------|----------------------|----------------------------------------|
| `loa-cert-admin` | `admin` | `admin` on every cataloged Cert path (Appendix A). Bypasses owner rule. |
| `loa-cert-staff` | `staff` | `write` on management paths (events, attendees, templates, certificates issue/email), `read` on read paths, `read`/`write` on author-scoped item paths + `read` on `/me/events`, `/me/templates`. No grants on `admin` paths. |
| `loa-cert-participant` | `participant` | `read` on `/me/certificates`, `/me/certificates/{id}`, `/certificates/{id}`, `/{id}/pdf`, `/{id}/download`, `/events/{id}`, `/certificates/qr` (owner rule applies). |

- Names are proposed; actual group names are an Auth-side seeding concern (open question Q-4).
- Because D2 (fresh start), there is **no bulk role migration** — users register and are assigned to groups by an Auth admin. A public registration user lands in `loa-cert-participant` (or unassigned) by default; the Auth admin promotes staff/admin.

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

| Legacy | Replacement |
|--------|-------------|
| `src/lib/supabase/*` (PostgREST clients, RLS reliance) | HTTP client for the Cert API (`https://cert-api.lyceumalabang.edu.ph/api/v1`, reached same-origin via the `/api` rewrite from the UI; §10.6), typed response envelope (§3.4), error normalization, multipart + binary support |
| `src/lib/repository/base.repository.ts` + `index.ts` | One typed module per resource (events, attendees, templates, certificates, dashboard, audit, verify/view), mirroring the current repository call sites so server actions change minimally |
| JSONB `rendered_pdf` / `file_data` base64 payloads | Superseded by server-side storage in Cert (PDFs on disk/object store; `api-endpoints.md` §7) |
| RLS + `current_user_id()` | Server-side enforcement in Cert (level + scope rules); `e-cert` sends only the Bearer token |

Conventions to honor (from `api-endpoints.md` §3): response envelope `{ data | data+meta | status/error }`, `limit`/`offset` pagination, RFC 3339 timestamps, PDF binary streams, multipart uploads, synchronous bulk results `{ success, failed, errors }`.

## 8.2 Feature → Endpoint Mapping

Legend: `read`/`write`/`admin` = `required_level`; **REMOVE** = feature deleted; **AUTH** = owned by Auth Platform; **GAP** = not in Cert v1.2 (see §13).

### Server Actions — Auth

| Legacy action | New |
|---------------|-----|
| `loginAction`, `register`, `forgotPassword`, `requestPasswordChange`, `updatePassword`, `updateEmail`, `confirmEmail`, `resetPassword`, `getCurrentUser` | **AUTH** — delete; identity from JWT claims (§6.4) |
| `getSessionRoleAction` | Derived locally from `permissions` claim (§7.4) |

### Server Actions — Users / Organizations / Demo

| Legacy action | New |
|---------------|-----|
| `listUsersAction`, `setUserRoleAction`, `banUserAction`, `unbanUserAction`, `deleteUserAction` | **AUTH** — delete; `/users` page removed |
| `createOrganizationAction`, `getMyOrganizationsAction`, `getOrganizationMembersAction`, `addMemberAction`, `removeMemberAction` | **REMOVE** — single org resolved from tenant claim (`api-endpoints.md` §3.3) |
| `setImpersonateUser`, `getImpersonateUserId`, `isDemoMode` | **REMOVE** — demo/impersonation excluded |

### Server Actions — Events

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

### Server Actions — Attendees

| Legacy action | New Cert endpoint | Level |
|---------------|-------------------|-------|
| `getAttendeesAction` | `GET /api/v1/events/{id}/attendees` | read |
| `addAttendeeAction` | `POST /api/v1/events/{id}/attendees` | write |
| `bulkAddAttendeesAction` | `POST /api/v1/events/{id}/attendees/import` (**CSV multipart** — legacy sent a JSON array; upload flow changes) | write |
| `updateAttendeeAction` | `PATCH /api/v1/attendees/{id}` | write |
| `removeAttendeeAction` | `DELETE /api/v1/attendees/{id}` | write |
| `removeAttendeeWithCertAction` | `DELETE /api/v1/attendees/{id}/with-cert` | admin |
| `getAttendeeDeletePreviewAction` | `GET /api/v1/attendees/{id}/delete-preview` | read |
| `getAttendeeFileDataAction` | `GET /api/v1/attendees/{id}/file-data` | read |
| `issueCertificatesForCompletedAction` | `POST /api/v1/events/{id}/issue-completed` | write |
| `revokeExpiredForEventAction` | `POST /api/v1/events/{id}/revoke-expired` (count = `GET` variant) | admin |
| `reissueCertificatesForSelectedAction` | `POST /api/v1/events/{id}/reissue` | admin |

### Server Actions — Certificates

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

### Server Actions — Templates

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

### Server Actions — Dashboard & Audit

| Legacy action | New Cert endpoint | Level |
|---------------|-------------------|-------|
| `getDashboardStatsAction` | `GET /api/v1/dashboard/stats` | read |
| `getRecentActivityAction` | `GET /api/v1/dashboard/activity` | read |
| `getAuditLogsAction` | `GET /api/v1/admin/audit-logs` | admin |
| `getAuditLogsForExportAction` | `GET /api/v1/admin/audit-logs/export` | admin |
| `getEntityAuditLogsAction`, `getUserAuditLogsAction`, `getAuditLogsByIdsAction`, `deleteAuditLogsAction`, `deleteAllAuditLogsAction` | **GAP** — not in Cert v1.2 (drop UI or defer) |

### API Routes (`src/app/api/*`)

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
| `/(dashboard)/events*` (list, new, `[id]`, upload, issue) | attendance CSV import becomes multipart |
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
| `/(participant)/my/profile` (email update) | Email/identity managed by Auth Platform (see Q-5) |

## 9.3 Components / Modules

- **Keep:** TipTap editors (certificate/email), base UI components, verify/view renderers (re-sourced from API responses), dashboard/event/certificate components.
- **Adapt:** PDF preview/download buttons → Cert PDF endpoints; QR display → `/api/v1/certificates/qr`; CSV upload → multipart; event/certificate detail → envelope-shaped responses.
- **Remove:** `src/lib/pdf/`, `src/lib/email/`, `src/lib/qr/`, `src/lib/supabase/`, `src/lib/storage/`, `src/lib/seed/`, `src/features/auth/` (UI), `src/features/users/`, `src/features/organizations/`, `src/features/demo/`.
- **Add:** typed Cert API client modules (§8.1), SSO fragment handler, token store (in-memory + httpOnly cookie sync, §6.3).

## 9.4 Feature Semantics Changes

| Legacy behavior | New behavior |
|-----------------|--------------|
| Async workflow for issue/reissue (`/api/workflow-status`) | **Synchronous** bulk results (`api-endpoints.md` §3.8) — UI shows per-item success/failed, no polling |
| Client-side PDF render + `save-pdf` (puppeteer, base64 cache) | PDF generated/streamed by Cert (DOMPDF); frontend only fetches/downloads |
| Auth email templates & SMTP in the app | Email templates + sending live in Cert; `e-cert` no longer holds SMTP creds |
| `organization_id` in every action | Omitted; org resolved from JWT `tenant.slug` |
| Local `user_memberships` role lookup (proxy + fallback) | JWT `permissions` claim → role (§7.4) |
| Login-gated download (`admin/staff OR recipient email`) | Cert owner rule + level (`read` + recipient scope, §9.6) |

---

# 10. Environment & Deployment

## 10.1 Env Contract for `e-cert` (`src/lib/env.ts`)

| Variable | Status | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_BASE_URL` | keep | `https://e-cert.vercel.app` (Vercel deployment origin; canonical UI origin) |
| `AUTH_BASE_URL` | add | `https://auth.lyceumalabang.edu.ph` (SSO login redirect, `/api/v1/auth/access`) |
| `CERT_API_BASE_URL` | add | `https://cert-api.lyceumalabang.edu.ph` (Cert API origin; browser calls go through the same-origin `/api` rewrite, §10.7) |
| `JWT_SECRET` | add | shared HS256 secret — verify-only, never sign, never commit |
| `CERT_TENANT_SLUG` | add | `loa` (validated against token `tenant.slug`) |
| `CERT_ACCESS_COOKIE` | add | cookie name (default `session`, per existing code) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | remove | no DB access |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | remove | email owned by Cert |
| Legacy `authConfig.jwtSecret` (local signing secret) | remove | replaced by shared `JWT_SECRET` (verify-only) |

> `e-cert` does **not** need `ENCRYPTION_KEY`/`ENCRYPTION_KEY_PREVIOUS` — SSO payload decryption happens in Cert (`api-endpoints.md` §9.3).

## 10.2 Auth Platform Configuration (prereq)

- `AUTH_ALLOWED_REDIRECTS` must include `https://e-cert.vercel.app` (and tenant `redirect_origins`).
- Seed the `loa` tenant Cert catalog (Appendix A of `api-endpoints.md` via `POST /api/v1/admin/tenants/{tenant}/endpoints/bulk`).
- Seed `loa-cert-admin` / `loa-cert-staff` / `loa-cert-participant` groups with level grants (§7.2).
- `JWT_SECRET` identical across Auth, Cert, `e-cert` (`assemblies/loa-auth-platform/environment.md`).

## 10.3 Topology (Q-1 — resolved: split origin)

The e-cert UI is deployed to Vercel (`e-cert.vercel.app`); the Laravel Cert API is a dedicated API host at `cert-api.lyceumalabang.edu.ph`.

- **Recommended:** the Next.js app adds a Vercel rewrite (`/api/v1/:path*` → `https://cert-api.lyceumalabang.edu.ph/api/v1/:path*`, §10.7) so the browser stays same-origin — the `loa_cert_refresh` cookie (`Path=/api/v1/auth`) keeps working and no CORS is needed.
- **Fallback:** direct cross-origin calls with `credentials`; then the Cert API must enable CORS for `https://e-cert.vercel.app` and the refresh cookie must be `SameSite=None; Secure` (`services/cors/README.md`).

## 10.4 Auth Platform Wiring (concrete)

| Item | Where | Value / Command |
|------|-------|-----------------|
| Shared `JWT_SECRET` | Auth `.env` `JWT_SECRET` — must equal Cert + e-cert | random 32+ chars, e.g. `openssl rand -base64 48`; never commit (auth `environment.md`) |
| `ENCRYPTION_KEY` | Auth `.env` (shared with Cert **only**, not e-cert) | 32 bytes hex-encoded (auth `web-ui.md` §4.1) |
| Redirect allowlist | Auth `.env` `AUTH_ALLOWED_REDIRECTS` + `loa` tenant `redirect_origins` | must include `https://e-cert.vercel.app` (`.env.example` now lists it) |
| `AUTH_REDIRECT_URL` | Auth `.env` | default `https://aces-api.lyceumalabang.edu.ph`; tenant SSO resolves from `?redirect=`, not this fallback |
| CORS | Auth `.env` `CORS_ALLOWED_ORIGINS` | include `https://e-cert.vercel.app` (needed for the cross-origin `GET /api/v1/auth/access` call) |
| Cert endpoint catalog | Auth `POST /api/v1/admin/tenants/{tenant}/endpoints/bulk` | body = `api-endpoints.md` Appendix A |
| Group grants | Auth `POST /api/v1/admin/tenants/{tenant}/groups/{group}/endpoints` | one call per group per cataloged path, level per §7.2 |

> These admin calls require a `users.manage`-granted Auth admin JWT (`routes/api.php` lines 69–86). The catalog/grant setup can also be driven through `access-config-import-export.md` (template → export → import) instead of one-by-one calls.

## 10.5 `JWT_SECRET` & Claim Contract

| Aspect | Contract |
|--------|----------|
| Shared | One `JWT_SECRET` value across Auth, Cert, e-cert (HS256; auth `environment.md`) |
| Direction | e-cert is **verify-only** — it never calls `signToken` / never issues tokens |
| Algorithms | HS256 only (`jose.jwtVerify` with `{ algorithms: ["HS256"] }`) |
| Must-check claims | `type=access`, `exp`, `tenant.slug=loa` (§6.4) |
| TTLs | access 15 min (`JWT_ACCESS_TTL=15`), refresh 7 days (`JWT_REFRESH_TTL=10080`) |
| `permissions` claim | array mixing `cert.*` keys + `<level>:<path>` entries; only levels are used for gating (§7.4) |
| `tenant` claim | `{ id, slug }`; slug must equal `CERT_TENANT_SLUG` |

## 10.6 Consuming the Cert API (concrete)

- Browser base URL (same-origin): `https://e-cert.vercel.app/api/v1` — i.e. `NEXT_PUBLIC_BASE_URL + "/api/v1"`, rewritten server-side to `https://cert-api.lyceumalabang.edu.ph/api/v1` (§10.7). Server-to-server calls from server actions may target `cert-api.lyceumalabang.edu.ph` directly.
- Auth header on every non-public call: `Authorization: Bearer <access>`.
- Success envelope: `{ "data": ... }` or `{ "data": [...], "meta": { limit, offset, total, has_more } }`; errors: `{ "status": "error", "message": ..., "errors": {...} }` (`api-endpoints.md` §3.4).
- `401` → silent refresh (§6.3) → retry once. `403` → genuine lack of permission — do **not** refresh/retry.
- PDFs are binary streams (`Content-Type: application/pdf`); never base64 in JSON. Uploads are `multipart/form-data`.
- Bulk results are synchronous: `{ "success": n, "failed": n, "errors": [...] }` (§3.8).

```typescript
// Example: list events (repository/server action)
const res = await fetch(`${CERT_API}/events?limit=25&offset=0`, {
  headers: { Authorization: `Bearer ${accessToken}` },
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
- The e-cert `session` cookie is set by Next.js itself (same origin, `Path=/`).
- Multipart uploads (attendee CSV import) and PDF binary streams pass through the rewrite; if a Vercel time/streaming limit is hit for a route, fall back to a direct cross-origin call to `cert-api.lyceumalabang.edu.ph` for that route (then the Cert API must apply `services/cors`).

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
| `src/lib/env.ts` | New schema per §10.1 (add `AUTH_BASE_URL`, `CERT_API_BASE_URL`, `JWT_SECRET`, `CERT_TENANT_SLUG`; drop Supabase/SMTP vars) |
| `src/lib/auth/jwt.ts` | Verify-only (§6.4); delete `signToken` |
| `src/lib/auth/session.ts` | `session` cookie = Auth access token (httpOnly, TTL = exp); drop `refresh` cookie; add cookie-refresh helper |
| `src/lib/auth/password.ts`, `tokens.ts` | Delete |
| `src/lib/auth/config.ts` | Cookie name/options only; remove local signing secret |
| `src/proxy.ts` | JWT-verify instead of Supabase membership lookup; `x-user-*` from claims (§6.5); redirect to `/sso/login` |
| `src/lib/permissions.ts` | JWT-claims-only role (§7.4); keep capability helpers |
| `src/lib/supabase/*`, `src/lib/storage/*`, `src/lib/seed/*` | Delete |
| `src/lib/repository/*` | Replace with HTTP client modules per resource (§8.1, §10.6) |
| `src/lib/pdf/*`, `src/lib/email/*`, `src/lib/qr/*` | Delete (Cert owns PDF/QR/email) |
| `src/features/auth`, `users`, `organizations`, `demo` | Delete |
| `src/app/(auth)/*` | Delete |
| `src/app/auth/confirm`, `auth/callback` | Delete; add SSO fragment handler (§6.2) |
| Server actions | Rewire per §8.2 to the Cert API client |
| `src/app/(dashboard)/users` | Delete |
| `src/app/(dashboard)/templates/auth-emails*` | Delete |
| `src/app/(participant)/my/profile` | Delete/simplify (Q-5) |
| `.env*` | Replace per §10.1 |
| `package.json` | Remove `@supabase/*`, `puppeteer-core`, `@sparticuz/chromium`, `nodemailer`, `bcryptjs`, `qrcode` |

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
| **A** | Review + promote `api-endpoints.md` v1.2 → Final; review + promote this spec → Final | user review |
| **B** | Auth readiness: redirect allowlist, cert catalog import, seed groups + grants (§10.2) | Auth `tenant-group-endpoint-grants.md` / catalog Final |
| **C** | Cert scaffold: `jwt.auth`/`jwt.endpoint`, callback/refresh/logout, core slice (events/attendees/templates/certificates) + tests | `api-endpoints.md` Final |
| **D** | `e-cert` auth swap: env, `src/lib/auth` (verify-only), `proxy.ts`, SSO fragment handler, session cookie, role resolution, remove auth pages/actions | this spec Final |
| **E** | `e-cert` data swap: typed Cert API client, rewire repositories/server actions per §8, PDF/QR/email/upload via API, remove legacy modules | this spec Final |
| **F** | UI cleanup + verification: removed pages/components, silent refresh, parity checks (login, event, issue, download, verify, view, audit) | — |
| **G** | Decommission legacy DB + deps (§11) | cutover verified |
| **H** | Phase 4 integration: cross-app JWT validation tests, OpenAPI, audit consistency (`PROJECT.md` Phase 4) | — |

Suggested first implementation slice (core-first, matching `SESSION-PROMPT.md`): SSO/session + events + attendees + templates + certificates against the Cert API; PDF/QR/email/audit/dashboard afterwards.

---

# 13. Risks & Open Questions

| ID | Question / Risk | Impact |
|----|-----------------|--------|
| Q-1 | ~~Confirm single-origin topology~~ **Resolved 2026-08-05**: UI on Vercel (`e-cert.vercel.app`), Cert API on `cert-api.lyceumalabang.edu.ph`. Decide rewrite-vs-CORS for `/api/v1` (rewrite recommended, §10.7) | Cookie scope + CORS + env vars |
| Q-2 | Confirm D8: access token mirrored into an httpOnly `session` cookie for SSR (refines `web-ui.md` §6.1 in-memory-only) | Security posture vs. SSR capability |
| Q-3 | Audit-log **delete** + entity/user/by-ids queries + global email logs are not in Cert v1.2 — drop these UI features, or extend the Cert API? | Scope of Cert API v1.2 |
| Q-4 | Confirm seed group names (`loa-cert-admin/staff/participant`) and whether to reuse existing LOA groups (Faculty, Students) instead | Auth seeding |
| Q-5 | `/my/profile` (update email) removed — identity/email managed by Auth Platform. Confirm participant profile is out of `e-cert` scope | UI scope |
| Q-6 | Certificate-number default pattern `LOA-YYYY-####` (was `EPOCH` in legacy) | Data defaults (inherited from `api-endpoints.md` open item) |
| Q-7 | CSV import replaces the legacy JSON bulk-add for attendees (`/attendees/import` is multipart CSV) — confirm the upload UX rework | Attendee import UX |
| R-1 | Stale `permissions` for token lifetime — users see old UI role until next login/refresh (mitigated by token TTL 15 min) | Role freshness |
| R-2 | Two httpOnly cookies (`session` + `loa_cert_refresh`) must stay in sync (silent refresh rewrites `session`) | Session reliability |
| R-3 | CORS avoided by the Vercel `/api` rewrite; if direct cross-origin calls are ever used, `services/cors` must be applied on the Cert API (and Auth, for `/access`) | Topology |

---

# 14. References

| Spec / doc | Role |
|------------|------|
| `assemblies/loa-cert-platform/api-endpoints.md` (v1.2) | Cert API source of truth; §4 levels, §6 routes, §7 data model, §9 SSO/JWT/permissions, Appendix A catalog |
| `assemblies/loa-cert-platform/web-ui.md` (v1.0) | Frontend spec; §4 SSO fragment, §5 permission mapping (superseded for roles by this spec §7), §6 token lifecycle (refined by D8) |
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

- **Status:** Draft v1.0 — created for user review; not to be implemented against until Final.
- **Authoritative source:** `loa-apache-server-apps/assemblies/loa-cert-platform/legacy-e-cert-integration.md`.
- **Synced working copy:** `D:\repos\hobby\e-cert\legacy-e-cert-integration.md` (same content; refactor drives from the `e-cert` copy).
