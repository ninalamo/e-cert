# Auth

**Version:** 2.0
**Status:** Final
**Layer:** `services` (identity plumbing — no ownership of identity)
**Audience:** Engineers, AI Development Agents

> Consolidated from `specs/auth/` (README, sso-fragment, session-handling, jwt-verification, role-resolution, proxy, account-management, user-activity, user-revocation). Detail specs archived; this file is normative.

---

# 1. Purpose

It answers:

> **"How does the SPA authenticate via Auth SSO and hold a session without owning identity?"**

---

# 2. Scope

## Owns

- SSO fragment handling, in-memory access token, JWT parse-for-display, client route guard, role derivation, silent refresh, logout.
- Files: `src/lib/auth/sso-fragment.ts`, `token-store.ts` (access + refresh helpers), `session-ready.ts` (readiness gate), `jwt.ts` (parse only), `auth-guard.tsx`, `index.ts` (barrel). Role helpers live in `src/lib/permissions.ts` + `src/lib/roles.ts`.

## Does Not Own

- Login/register/forgot-password UI, token issuance/signing, user/role management (Auth Platform).
- SSO payload decryption, refresh-cookie minting (Cert `POST /auth/callback`).
- Deleted: `password.ts`, `tokens.ts` (DB), `config.ts` (legacy), `(auth)` pages, `auth/confirm|callback` routes, all login/register server actions, `src/proxy.ts`.

---

# 3. UI Contract

```
1. Guard hits protected route, no token → redirect to
   {AUTH}/sso/login?redirect={BASE_URL}
2. Auth encrypts payload (AES-256-GCM) → redirects to {BASE_URL}#payload=<base64url>
3. sso-fragment.ts detects fragment → history.replaceState clears it → POST /api/v1/auth/callback {payload}
4. Cert decrypts/validates, sets httpOnly loa_cert_refresh, returns { access_token }
5. token-store holds access token in memory → redirect to intended destination
```

URLs: sign-in `{AUTH}/sso/login` (never `/login` — admin-only), register `{AUTH}/sso/register`, passwords `{AUTH}/forgot-password` + `/reset-password`.

---

# 4. API Calls

| Action | Call | Notes |
|--------|------|-------|
| callback | `POST /api/v1/auth/callback {payload}` | public; returns access token |
| refresh | `POST /api/v1/auth/refresh` (cookie) | 401 path retries once, then SSO redirect |
| logout | `POST /api/v1/auth/logout` | clear memory + cookie, land on `/` |

---

# 5. Rules

- Access token in JS memory only — never `localStorage`/`sessionStorage`; refresh token httpOnly (`loa_cert_refresh`, `Path=/api/v1/auth`, `SameSite=Lax`).
- JWT is parsed client-side for UI gating only (`resolveRoleFromPermissions()` over `permissions` `<level>:<path>`); Cert API verifies signature/exp/tenant server-side.
- Callback failure clears partial state — never redirect-loop to Auth.
- No DB role lookup; no server-side JWT verification; no `src/proxy.ts`.

---

# 6. Tests

- [ ] `e2e/tests/auth/auth-flow.spec.ts` (exists) — guard redirect, callback→dashboard, callback failure, logout.
- [ ] `src/__tests__/phase-h/jwt-validation.test.ts` (Vitest, exists) — JWT parse + role resolution.
- [ ] Planned: refresh/gating suites per `testing.md`.

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Signing tokens in e-cert | Auth owns issuance |
| `/login` for SSO | Admin-only; use `/sso/login` |
| `localStorage` tokens | XSS-readable; memory only |
| Server-side auth/cookie session | CSR — client-side only |

---

# 8. Guiding Principle

> **No local identity, no server-side auth.** Memory token in, Bearer out, SSO when missing.
