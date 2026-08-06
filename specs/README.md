# LOA e-cert — Frontend Assembly Specification
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`)
**Audience:** Engineers, AI Development Agents

> **Parent spec:** `loa-apache-server-apps/assemblies/loa-cert-platform/legacy-e-cert-integration.md` (the governing integration spec that drives this refactor).

---

# 1. Purpose

It answers:

> **"How is the legacy `e-cert` Next.js app refactored into a client-side SPA that consumes the LOA Auth + Cert platforms, with no local identity, no server-side data access, and no server actions?"**

This spec defines the front-end component specifications that implement the refactor described in `legacy-e-cert-integration.md`. It covers:

- (a) removing the self-hosted auth stack and adopting Auth Platform SSO
- (b) resolving roles from JWT `permissions` claim (level-based)
- (c) replacing every Supabase data access and server action with client-side Cert API calls
- (d) pages, components, and features to keep / remove / adapt
- (e) environment and deployment changes

---

# 2. Scope

## Owns

- Front-end spec files governing the refactored `e-cert` Next.js application
- Auth/session layer (SSO fragment handling, in-memory token, refresh flow)
- Client-side API client (replacing both Supabase access and server actions)
- Pages and components (what stays, what is removed, what is adapted)
- Environment contract and Vercel deployment topology

## Does Not Own

- Auth Platform login/register/forgot-password/update-password UI (`auth.lyceumalabang.edu.ph`)
- Auth Platform user/role/group management (admin dashboard)
- Cert Platform API implementation (Laravel, `cert-api.lyceumalabang.edu.ph`)
- PDF/QR/email generation (Cert Platform, DOMPDF)
- Auth-type email templates (Auth Platform)
- Demo mode / impersonation (excluded by decision D2)

---

# 3. Architecture Note: Client-Side SPA

The refactored `e-cert` app is a **client-side SPA**:

- **No DB access.** Every Supabase/PostgREST import is removed.
- **No server actions.** All ~75 server actions are deleted. Data mutations happen via client-side `fetch()` to the Cert API (through Vercel rewrites).
- **No server-side auth.** No httpOnly session cookie, no server-side JWT verification, no proxy auth injection. Identity is an in-memory access token.
- **No local identity.** No signing tokens, no password hashes, no users table.
- **No PDF/QR/email generation.** These are produced by the Cert Platform.
- **Client-side only.** Next.js is used for routing and file-system conventions. All data fetching and state management happens in the browser.
- **Split origin.** UI on Vercel (`e-cert.vercel.app`); Cert API on `cert-api.lyceumalabang.edu.ph`. Browser calls go through same-origin Vercel rewrites.

**Why CSR over SSR:**
- The server actions in this app are thin wrappers around Supabase calls — they earn their complexity
- SSR adds the D8 dual-cookie model (httpOnly session + refresh sync) with no real benefit for a dashboard app
- CSR means MSW mocks 100% of API calls — one test layer instead of two
- The TipTap editors and interactive UI are already client-side
- SEO doesn't matter for an authenticated dashboard

---

# 4. Spec Map

| Spec file | Governs |
|-----------|---------|
| `auth/README.md` | Auth & SSO integration overview |
| `auth/jwt-verification.md` | Client-side JWT parsing for UI gating (not security enforcement) |
| `auth/session-handling.md` | In-memory access token, refresh flow, silent restore |
| `auth/sso-fragment.md` | SSO fragment handler (`#payload=` detection, Cert callback) |
| `auth/role-resolution.md` | Frontend role derivation from JWT `permissions` claim |
| `api-client/` | Cert API typed HTTP client (replaces server actions + Supabase) |
| `pages/` | Pages to keep / remove / adapt |
| `components/` | Components to keep / remove / adapt |
| `environment/` | Env contract, Vercel rewrites |
| `deployment/` | Deployment topology |
| `testing/` | E2e test strategy (Playwright + MSW, single layer) |
| `data-flow.md` | Data flow, service dependencies, security boundaries, tampering prevention |

> Note: `auth/proxy.md` is removed. The proxy middleware is no longer needed for auth injection. CSRF and rate-limiting may still be handled at the edge, but identity is purely client-side.

---

# 5. Governing Decisions

These decisions from `legacy-e-cert-integration.md` are normative for this spec:

| # | Decision | Frontend Impact |
|---|----------|-----------------|
| D1 | Refactor existing Next.js app | No greenfield; replace auth + data layers only |
| D2 | Fresh start — no data migration | No legacy data porting; users re-register on Auth |
| D5 | Roles via Auth Platform user-groups + level grants | `resolveRoleFromPermissions()` replaces DB lookup |
| D6 | PDF/QR/email owned by Cert Platform | Remove `puppeteer`, `qrcode`, `nodemailer` deps |
| ~~D8~~ | ~~SSR access-token cookie~~ | **Superseded.** CSR uses in-memory token only (per `web-ui.md` §6.1) |

---

# 6. Implementation Phases

| Phase | Work | Spec Gate |
|-------|------|-----------|
| **D** | Auth swap: env, SSO fragment handler, in-memory token, role resolution, remove auth pages/actions/server actions, delete `src/lib/auth/` legacy | This spec → Final + e2e auth tests pass |
| **E** | Data swap: typed Cert API client modules, delete all server actions, delete `src/lib/supabase/`, `src/lib/repository/`, `src/lib/pdf/`, `src/lib/email/`, `src/lib/qr/`, `src/lib/storage/` | This spec → Final + e2e domain tests pass |
| **F** | UI cleanup + verification: removed pages/components, silent refresh, parity checks | e2e full suite passes |

---

# 7. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Writing code against a Draft spec | Spec must be Final before implementation (Rule 0) |
| Signing JWT tokens in `e-cert` | e-cert is a consumer; Auth Platform owns token issuance |
| Accessing Supabase directly | All data access goes through the Cert API |
| Using server actions for data mutations | All mutations are client-side `fetch()` calls |
| Adding httpOnly session cookie | CSR uses in-memory token only; no SSR verification needed |
| Using `auth.lyceumalabang.edu.ph/login` for SSO | Tenant apps must use `/sso/login` (admin-only route) |
| Role resolution from DB | Role derived from JWT `permissions` claim |
| Hardcoded `organization_id` in API calls | Org resolved from JWT `tenant.slug` server-side |
| Skipping e2e tests | Every phase requires passing e2e tests before moving to the next |

---

# 8. Guiding Principle

> **Spec-first.** No implementation code is written against this document until it (and its governing specs) are **Final**. The spec is the source of truth; code must match the spec, never the reverse.
