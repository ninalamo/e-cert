# LOA e-cert — In-Memory Token Storage
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Auth Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §6.3, refined by CSR decision. Supersedes Decision D8 (SSR access-token cookie).

---

# 1. Purpose

It answers:

> **"How does a client-side SPA hold and use an access token for identity?"**

This replaces the SSR dual-cookie model (D8) with the simpler in-memory approach from `web-ui.md` §6.1.

---

# 2. Scope

## Owns

- In-memory access token store (JavaScript module singleton)
- Token set/clear/read operations
- 401 → refresh → retry flow
- Silent restore on app load (refresh if cookie exists)
- Logout (clear token, call Cert logout endpoint)

## Does Not Own

- Refresh token cookie (`loa_cert_refresh`) — owned by Cert Platform
- Token signing (Auth Platform)
- SSO fragment handling (see `sso-fragment.md`)

---

# 3. Design

## 3.1 In-Memory Token Store

```typescript
// src/lib/auth/token-store.ts
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
```

- **No `localStorage`/`sessionStorage`.** Tokens live only in the JS module scope.
- **Lost on page refresh.** The silent restore flow re-acquires the token via refresh.
- **Not accessible to XSS via DOM.** The token is never in a DOM attribute or cookie.

## 3.2 Refresh Token Cookie

| Property | `loa_cert_refresh` cookie |
|----------|---------------------------|
| Value | Refresh token (opaque) |
| HttpOnly | Yes |
| Secure | Yes |
| SameSite | Lax |
| Path | `/api/v1/auth` |
| MaxAge | 7 days |
| Set by | Cert Platform (via Vercel rewrite) |
| Read by | Cert Platform only (`POST /api/v1/auth/refresh`) |

The refresh cookie is the **only** persistent auth state. It's httpOnly (JS cannot read it) and managed entirely by Cert.

---

# 4. Token Lifecycle

## 4.1 Establish Session (after SSO callback)

1. Cert `POST /api/v1/auth/callback` returns `{ access_token, expires_in }`.
2. e-cert stores `access_token` in memory via `setAccessToken()`.
3. Cert sets `loa_cert_refresh` cookie (httpOnly, Path=/api/v1/auth).

## 4.2 Client API Calls

1. Attach `Authorization: Bearer <in-memory access>` to every non-public fetch.
2. On `401`: perform silent refresh (§4.3), retry once.
3. On `403`: genuine lack of permission — do not refresh/retry.

## 4.3 Refresh Flow

1. Client detects `401` from Cert API.
2. `POST /api/v1/auth/refresh` (same-origin via Vercel rewrite, `loa_cert_refresh` cookie sent automatically).
3. Cert validates cookie, returns new `{ access_token, expires_in }`.
4. Client updates in-memory token via `setAccessToken()`.
5. Client retries the original request once.

## 4.4 Silent Restore (app load)

1. Browser has `loa_cert_refresh` cookie but no in-memory token (page refresh, new tab).
2. On app load, client attempts `POST /api/v1/auth/refresh`.
3. If refresh succeeds: store new access token, proceed.
4. If refresh fails: no session, show SSO login link.

## 4.5 Logout

1. `POST /api/v1/auth/logout` (clears `loa_cert_refresh`; Cert Platform).
2. `clearAccessToken()` — drop in-memory token.
3. Redirect to landing page or SSO login.

---

# 5. Token Expiry Handling

| Concern | Detail |
|---------|--------|
| Access token TTL | 15 min (Auth Platform) |
| Refresh token TTL | 7 days (Cert Platform) |
| Stale permissions | Group/grant changes take effect at next refresh (mitigated by short TTL) |
| Page refresh | In-memory token lost; silent restore re-acquires via refresh |

---

# 6. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Storing access token in `localStorage` | Persistent storage is a security risk; tokens in memory only |
| Storing access token in `sessionStorage` | Same as above; also accessible to same-origin tabs |
| Setting a `session` httpOnly cookie for access token | Unnecessary for CSR; adds complexity without benefit |
| Refreshing on every request | Wasteful; refresh only on 401 or silent restore |
| Setting `SameSite=None` on refresh cookie | Unnecessary; same-origin via Vercel rewrite |

---

# 7. Guiding Principle

> **Memory only, refresh cookie handles persistence.** The access token lives in JS memory for the duration of a session. The `loa_cert_refresh` cookie (httpOnly, Cert-managed) is the only persistent auth state.
