# Platform (env, deploy, data-flow)

**Version:** 2.0
**Status:** Final
**Layer:** `services` (runtime topology)
**Audience:** Engineers, AI Development Agents

> Consolidates `specs/environment/`, `specs/deployment/`, `specs/data-flow.md`.

---

# 1. Purpose

It answers:

> **"How is the SPA configured, deployed, and where does data/security live?"**

---

# 2. Scope

## Owns

- Env contract, Vercel rewrite, cookie scope, trust boundaries, storage map.

## Does Not Own

- Cert DB schema, Auth internals, feature behavior.

---

# 3. UI Contract

Topology: `Browser → {BASE_URL} (Next.js) → /api/v1/* + /api/events/* Route Handlers (serverless on Vercel) → Cert/Auth hosts`; SSO redirect → `{AUTH}/sso/login`.

There are **no Vercel/next-config rewrites** (`vercel.json` is `{}`, `next.config.ts` has no `rewrites()`). All proxying is the two Route Handlers (see `api-client.md` + `api-bff-layer.md`):

- `/api/v1/*` → `CERT_API_URL`, except non-callback/refresh/logout `auth/*` → `AUTH_API_URL`.
- `/api/events/*` → `CERT_API_URL/api/v1/events/*` (legacy event-detail bulk path).

Cookie: `loa_cert_refresh` set by Cert, passed through the BFF `set-cookie` untouched — so it lands on e-cert's own domain (`Path=/api/v1/auth`, `SameSite=Lax`). No session cookie, no access-token cookie.

---

# 4. API Calls

All browser data calls are same-origin `/api/v1/*` (plus legacy `/api/events/*`), forwarded by the BFF. Direct cross-origin calls forbidden (CORS + cookie scope). Public (no token): `GET /verify/{number}`, `GET /view/{id}`, `POST /auth/callback`. Everything else: Bearer + level (`read`/`write`/`admin`) + owner rules, enforced by Cert `jwt.auth`/`jwt.endpoint`. Full Vercel variable table: `vercel-deploy.md`.

---

# 5. Rules

Env — canonical Vercel set (Production + Preview, exact values in `vercel-deploy.md`):

```env
NEXT_PUBLIC_BASE_URL=https://staging-loa-vericert.vercel.app
NEXT_PUBLIC_AUTH_BASE_URL=https://auth.lyceumalabang.edu.ph
NEXT_PUBLIC_CERT_TENANT_SLUG=loa-e-cert
NEXT_PUBLIC_CERT_API_URL=https://cert-api.lyceumalabang.edu.ph # legacy, unread by code — do not use
```

Plus local-only BFF targets (`.env`, server-side, never shipped to the browser):

```env
CERT_API_URL=http://localhost:9001
AUTH_API_URL=http://localhost:8080
```

On Vercel these two are unset, so the BFF falls back to the production hosts. No Supabase/SMTP/JWT_SECRET/ENCRYPTION_KEY — nothing reads them.

Storage: access token = memory (15 min); refresh = httpOnly cookie (7 days); identity/groups/permissions = JWT claims; events/certs/templates/audit/PDFs = Cert side. e-cert never stores passwords, DB/SMTP creds, or signing keys. Tampering (JWT edit, tenant swap, replay, CSV bypass) is defeated server-side — client never trusted.

---

# 6. Tests

- [ ] BFF targets resolve (local `:9001`/`:8080`, Vercel fallbacks) — see `vercel-deploy.md` checks.
- [ ] Protected call without token → SSO; with forged JWT → Cert 401/403.
- [ ] Cookie scoped to `/api/v1/auth`, Lax, set on e-cert's own domain.

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Cross-origin API calls | Breaks CORS + cookie scope |
| Adding secrets to env | Client holds none |
| Trusting client JWT parse for security | Cert API is the boundary |

---

# 8. Guiding Principle

> **Same-origin via BFF, client-side only.** Browser talks to one host; Cert enforces everything.
