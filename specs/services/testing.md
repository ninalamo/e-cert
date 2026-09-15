# Testing

**Version:** 2.0
**Status:** Final
**Layer:** `services` (verification)
**Audience:** Engineers, AI Development Agents

> Consolidates `specs/testing/` + `specs/local-dev/`. Mock: `mock/server.ts` + `mock/db.json`.

---

# 1. Purpose

It answers:

> **"How do we verify the SPA — SSO, gating, API flows, refresh, errors — with one mock-backed setup?"**

---

# 2. Scope

## Owns

- Vitest (unit/component/integration), Playwright (e2e), Express mock server, seed data, mock↔live handoff, test users.

## Does Not Own

- Cert/Auth suites, perf/load tests.

---

# 3. UI Contract

```
mock/server.ts :3001 Express (MOCK_PORT override) + mock-auth :3002 (MOCK_AUTH_PORT override)
  — envelope { data | data+meta | status/error }, PDF Blob, auth handlers (/auth/tokens, /auth/callback, /auth/refresh)
next dev :3000 ── /api/v1/* BFF ──▶ CERT_API_URL (see platform.md for port alignment note)
Playwright (e2e/playwright.config.ts) starts mock:3001 + dev:3000, tests against :3000
```

Scripts: `dev` (app only), `dev:local` (mock + app concurrently), `mock:start`, `test` / `test:watch` (vitest), `test:e2e` (playwright).

What exists today:

| Layer | Files |
|-------|-------|
| Vitest (`vitest.config.ts`, `src/**/*.test.ts`, setup `src/__tests__/setup.ts`) | `bff-proxy-route`, `attendees-manager-pagination`, `phase-h/audit-consistency`, `phase-h/jwt-validation` — 56 tests green |
| Playwright e2e | `e2e/tests/auth/auth-flow.spec.ts` + `e2e/fixtures/auth.ts` (admin/staff/participant fixtures via direct `POST :3001/api/v1/auth/tokens`, plus SSO auto-login via `:3002/sso/login`) |
| Mock seed | `mock/db.json` (LOA events, attendees, certificates, templates, audit) |

Users (JWT claims): `admin@test.com` (`admin:/api/v1/*`), `staff@test.com` (`write:/api/v1/events`, `write:/api/v1/certificates`, `read:/api/v1/*`), `participant@test.com` (`read:/api/v1/me/certificates`). Mock Auth on `:3002` simulates SSO (`/sso/login?redirect=...&email=...&password=...` → `#payload=`); `POST /auth/tokens` bypasses SSO for fixtures.

---

# 4. API Calls

Tests hit the same `/api/v1/*` surface as prod (mock mirrors paths, envelope, error shape, auth flows). There is no mock↔live env switch in code (`NEXT_PUBLIC_CERT_API_TARGET` appears in no source file) — the BFF target is `CERT_API_URL`/`AUTH_API_URL` (see `platform.md`).

Port alignment (resolved): `.env` points the BFF at the mock (`CERT_API_URL=http://localhost:3001`, verified serving `/events` + `/auth/callback`). For real local Cert/Auth stacks (`:9001`/`:8080`), toggle `.env` back — it's gitignored local config. Mock-auth stays `:3002` (fixtures address it directly).

---

# 5. Rules

- Never hit prod with e2e; never mock inside `src/` (mock layer is `mock/` only).
- Fresh fixtures per test; `baseURL` from config, no hardcoded URLs.
- Phase gates: D = sso/session/gating suites; E = CRUD suites; F = full suite.

---

# 6. Tests

| Suite | Status |
|-------|--------|
| Vitest: bff-proxy-route, attendees-pagination, audit-consistency, jwt-validation | exists, green (56) |
| e2e: auth-flow (redirect, callback, failure, logout) | exists |
| e2e: roles gating, event/certificate/template CRUD, verify/view, stats/audit | planned — add spec files under `e2e/tests/` as features land |

```bash
npx vitest run
npx playwright test
npx playwright test e2e/tests/auth/
```

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Hitting prod Cert API locally | Isolation; no cross-env contamination |
| Mocking inside `src/` | Mock layer is `mock/` only |
| Shared mutable test state | Fresh fixtures |

---

# 8. Guiding Principle

> **One mock, one truth.** Same contract locally and in CI; align the BFF ports once, then grow the suite.
