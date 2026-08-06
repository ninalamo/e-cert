# LOA e-cert — E2E Testing Strategy
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Testing Module
**Audience:** Engineers, AI Development Agents

> **Governing specs:** All specs in `specs/auth/`, `specs/api-client/`, `specs/pages/`, `specs/components/`

---

# 1. Purpose

It answers:

> **"How do we verify the refactored `e-cert` SPA works end-to-end — SSO login, role-gated pages, API calls, token refresh, and error handling — with a single test layer?"**

---

# 2. Scope

## Owns

- E2e test strategy and framework selection
- Test infrastructure (Playwright, fixtures, test users, MSW mocks)
- Test scenarios covering the full auth + data flow
- Acceptance criteria per spec area

## Does Not Own

- Unit/integration tests (optional, not required for CSR approach)
- Cert API or Auth Platform test suites
- Performance/load testing

---

# 3. Test Framework

| Component | Choice | Rationale |
|-----------|--------|-----------|
| E2e framework | **Playwright** | Best Next.js support, multi-browser, built-in assertions |
| Mocking | **JSON Server** | Lightweight mock API server; same mock for dev and e2e (see `specs/local-dev/`) |
| Language | TypeScript | Matches the app codebase |
| Fixtures | Playwright custom fixtures | Reusable auth state, test user helpers |

**Single test layer.** No Vitest needed for the CSR approach — JSON Server covers everything.

---

# 4. Directory Structure

```
e2e/
├── playwright.config.ts
├── fixtures/
│   ├── auth.ts                       # Auth fixtures (login as admin/staff/participant)
│   └── base.ts                       # Base fixture extending Playwright's
├── tests/
│   ├── auth/
│   │   ├── sso-flow.spec.ts          # SSO fragment handling, callback, session
│   │   ├── session-refresh.spec.ts   # Token refresh, silent restore
│   │   ├── route-protection.spec.ts  # Unauthenticated redirect
│   │   └── logout.spec.ts            # Session cleanup
│   ├── roles/
│   │   ├── admin-gating.spec.ts      # Admin-only pages and actions
│   │   ├── staff-gating.spec.ts      # Staff capabilities
│   │   └── participant-gating.spec.ts # Participant own-data only
│   ├── events/
│   │   ├── event-crud.spec.ts        # Create, list, update, delete
│   │   ├── attendee-import.spec.ts   # CSV parse → JSON import
│   │   └── certificate-issue.spec.ts # Issue, bulk issue
│   ├── certificates/
│   │   ├── certificate-list.spec.ts  # List, search
│   │   ├── certificate-pdf.spec.ts   # PDF download
│   │   └── certificate-revoke.spec.ts # Revoke, delete
│   ├── templates/
│   │   ├── template-crud.spec.ts     # Create, edit, delete
│   │   └── tipTap-editor.spec.ts     # Template editing persistence
│   ├── public/
│   │   ├── verify.spec.ts            # Public certificate verification
│   │   └── view.spec.ts             # Public certificate viewer
│   └── dashboard/
│       ├── stats.spec.ts             # Dashboard stats render
│       └── audit.spec.ts            # Audit trail (admin only)
└── global-setup.ts                   # JSON Server start
```

---

# 5. Test Infrastructure

## 5.1 Playwright Config

```typescript
// e2e/playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npx tsx mock/server.ts",
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

## 5.2 Test Users (from JWT claims)

| User | Permissions (level-based) | Resolved Role |
|------|---------------------------|---------------|
| `admin@test.com` | `["admin:/api/v1/*"]` | `admin` |
| `staff@test.com` | `["write:/api/v1/events", "write:/api/v1/certificates", "read:/api/v1/*"]` | `staff` |
| `participant@test.com` | `["read:/api/v1/me/certificates"]` | `participant` |

## 5.3 Auth Fixture

```typescript
// e2e/fixtures/auth.ts
import { test as base } from "@playwright/test";

function createTestJWT(email: string, permissions: string[]): string {
  const payload = {
    sub: "test-user-uuid",
    email,
    name: "Test User",
    groups: ["loa-cert-test"],
    permissions,
    tenant: { id: "test-tenant", slug: "loa" },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: "access",
  };
  return btoa(JSON.stringify(payload));
}

type AuthFixtures = {
  adminPage: Page;
  staffPage: Page;
  participantPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addCookies([{
      name: "loa_cert_refresh",
      value: "test-refresh-token",
      domain: "localhost",
      path: "/api/v1/auth",
    }]);
    const page = await context.newPage();
    // Set in-memory token via page.evaluate
    await page.goto("/");
    await page.evaluate((token) => {
      // Access the token store module and set the token
      (window as any).__setAccessToken(token);
    }, createTestJWT("admin@test.com", ["admin:/api/v1/*"]));
    await use(page);
    await context.close();
  },
  // ... staffPage, participantPage similarly
});
```

## 5.4 Mock Data (JSON Server)

The mock API runs on `localhost:3001` with seed data from `mock/db.json`. See `specs/local-dev/README.md` for:
- Seed data structure (events, certificates, templates, audit logs)
- Custom route handlers (auth callback, event stats, etc.)
- How to extend the mock for new endpoints

Tests hit the same mock server used for local development.

---

# 6. Test Scenarios

## 6.1 Auth Flow

| Test | Scenario | Expected |
|------|----------|----------|
| `sso-flow.spec.ts` | Protected page → redirect to Auth SSO | URL changes to `auth.lyceumalabang.edu.ph/sso/login` |
| `sso-flow.spec.ts` | SSO fragment `#payload=...` → callback → token stored | Redirect to `/dashboard`, in-memory token set |
| `sso-flow.spec.ts` | SSO callback fails | No token, error state, no redirect loop |
| `session-refresh.spec.ts` | 401 → refresh → retry succeeds | New token, original request succeeds |
| `session-refresh.spec.ts` | 401 → refresh fails | Redirect to SSO login |
| `route-protection.spec.ts` | Unauthenticated → `/dashboard` | Redirect to SSO login |
| `route-protection.spec.ts` | Unauthenticated → `/` | No redirect (public) |
| `logout.spec.ts` | Logout → token cleared | No token, landing page |

## 6.2 Role Gating

| Test | Scenario | Expected |
|------|----------|----------|
| `admin-gating.spec.ts` | Admin → `/users` | Page loads |
| `admin-gating.spec.ts` | Staff → `/users` | Redirect to `/dashboard` |
| `admin-gating.spec.ts` | Participant → `/users` | Redirect to `/my` |
| `staff-gating.spec.ts` | Staff → `/events` | Page loads |
| `participant-gating.spec.ts` | Participant → `/my/certificates` | Page loads |
| `participant-gating.spec.ts` | Participant → `/events` | Redirect to `/my` |

## 6.3 Domain Features

| Test | Scenario | Expected |
|------|----------|----------|
| `event-crud.spec.ts` | Create event → list shows it | API mock called, UI updates |
| `attendee-import.spec.ts` | Parse CSV client-side → `POST` JSON import → attendees created | JSON payload to `/attendees/import`, success toast |
| `certificate-issue.spec.ts` | Issue cert → cert appears | API mock called, list refresh |
| `certificate-pdf.spec.ts` | Click download → PDF blob | API mock returns blob, download triggered |
| `template-crud.spec.ts` | Edit template → save | TipTap content saved via PATCH mock |
| `verify.spec.ts` | Enter number → verify → result | Public endpoint, no auth required |
| `stats.spec.ts` | Dashboard loads → stats render | API mock called, cards display |

---

# 7. Acceptance Criteria

| Spec Area | Required E2e Tests | Gate |
|-----------|-------------------|------|
| `auth/sso-fragment.md` | `sso-flow.spec.ts` | Phase D |
| `auth/session-handling.md` | `session-refresh.spec.ts`, `logout.spec.ts` | Phase D |
| `auth/role-resolution.md` | `*-gating.spec.ts` | Phase D |
| `api-client/` | `event-crud.spec.ts`, `certificate-*.spec.ts`, `template-crud.spec.ts` | Phase E |
| `pages/` | All page-level tests pass | Phase F |

---

# 8. Test Execution

```bash
npx playwright test                    # Run all
npx playwright test tests/auth/        # Auth suite only
npx playwright test --ui               # Interactive UI
npx playwright test --headed           # Debug mode
npx playwright show-report             # HTML report
```

---

# 9. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Testing against production | Never hit prod with e2e tests |
| Mocking server-side code | CSR approach means everything is client-side; JSON Server covers all |
| Hardcoded URLs | Use `baseURL` from config |
| Shared test state | Each test gets fresh fixtures |
| Skipping auth tests | Auth is the foundation |

---

# 10. Guiding Principle

> **Single layer, full coverage.** Playwright + JSON Server tests the entire user journey in the browser. No separate server-side test layer needed for the CSR approach.
