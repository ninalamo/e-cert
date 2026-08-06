# LOA e-cert — Auth & SSO Integration
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Auth Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §6 (Identity & SSO Integration)

---

# 1. Purpose

It answers:

> **"How does the refactored `e-cert` client-side SPA authenticate users via the Auth Platform SSO and maintain a session without owning identity?"**

---

# 2. Scope

## Owns

- SSO fragment handling (`#payload=` detection and extraction)
- In-memory access token management (store, read, clear)
- JWT parsing for UI gating (not security enforcement)
- Auth guard (client-side route protection)
- Role resolution from JWT `permissions` claim
- Silent token refresh flow

## Does Not Own

- Login, register, forgot-password, update-password UI (Auth Platform)
- Token issuance / signing (Auth Platform)
- SSO callback decryption (Cert Platform, `POST /api/v1/auth/callback`)
- Refresh token cookie management (Cert Platform, `loa_cert_refresh`)
- User/role/group management (Auth Platform admin dashboard)

---

# 3. Removed Auth Surface

| Legacy artifact | Action |
|-----------------|--------|
| `src/lib/auth/password.ts` | Delete |
| `src/lib/auth/tokens.ts` | Delete |
| `src/lib/auth/jwt.ts` | Rewrite to client-side JWT parsing (see `jwt-verification.md`) |
| `src/lib/auth/session.ts` | Rewrite to in-memory token store (see `session-handling.md`) |
| `src/lib/auth/config.ts` | Delete or reduce to SSO callback path only |
| `src/app/(auth)/login`, `register`, `forgot-password`, `update-password` | Delete |
| `src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts` | Delete |
| Auth server actions (`loginAction`, `register`, `forgotPassword`, etc.) | Delete |
| All server actions (`features/*/server/*.actions.ts`) | Delete — replaced by client-side API calls |
| `src/lib/supabase/*`, `src/lib/storage/*`, `src/lib/seed/*` | Delete |
| `src/lib/permissions.ts` DB lookups | Rewrite to JWT-claims-only |
| `src/proxy.ts` auth injection | Delete — no server-side auth needed |

---

# 4. SSO Flow

```
1. Unauthenticated user hits a protected page on e-cert.vercel.app
2. Client-side auth guard redirects to:
     https://auth.lyceumalabang.edu.ph/sso/login?redirect=https://e-cert.vercel.app
3. User authenticates on the Auth Platform
4. Auth Platform encrypts the token payload (AES-256-GCM) and redirects to:
     https://e-cert.vercel.app#payload=<base64url_encrypted>
5. e-cert client-side code detects the fragment, clears it via history.replaceState,
   and POSTs to the Cert callback
6. Cert POST /api/v1/auth/callback decrypts + validates, sets httpOnly cookie
   loa_cert_refresh, returns the access token
7. e-cert stores the access token in memory and redirects to the intended destination
```

**Concrete SSO URLs:**

| Purpose | URL |
|---------|-----|
| Sign-in (tenant flow) | `https://auth.lyceumalabang.edu.ph/sso/login?redirect=https://e-cert.vercel.app` |
| Registration | `https://auth.lyceumalabang.edu.ph/sso/register` |
| Forgot / reset password | `https://auth.lyceumalabang.edu.ph/forgot-password` / `https://auth.lyceumalabang.edu.ph/reset-password` |
| Callback target | `https://e-cert.vercel.app#payload=<encrypted>` |

> `/login` is the **admin** login. Tenant apps must always use `/sso/login`.

---

# 5. Components

| Component | Spec file |
|-----------|-----------|
| JWT parsing | `jwt-verification.md` |
| Token storage | `session-handling.md` |
| SSO fragment handler | `sso-fragment.md` |
| Role resolution | `role-resolution.md` |

---

# 6. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Signing tokens in `e-cert` | e-cert is a consumer; Auth Platform owns issuance |
| Using `/login` for SSO | `/login` is admin-only; tenant apps must use `/sso/login` |
| Storing tokens in `localStorage`/`sessionStorage` | Tokens in memory only; never persistent storage |
| Redirecting to Auth on callback failure | Causes redirect storm; clear partial state instead |
| DB lookup for role | Role derived from JWT `permissions` claim |
| Server-side JWT verification | CSR; all verification is client-side for UI gating only |

---

# 7. Guiding Principle

> **No local identity, no server-side auth.** `e-cert` never signs tokens, stores password hashes, or reads a users table. Identity is an in-memory access token derived from the Auth Platform's SSO callback.
