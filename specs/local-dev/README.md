# LOA e-cert — Local Development
## Product Assembly Component Specification

**Version:** 1.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Infrastructure Module
**Audience:** Engineers, AI Development Agents

> **Governing specs:** `specs/deployment/`, `specs/environment/`, `specs/api-client/`

---

# 1. Purpose

It answers:

> **"How does a developer run the `e-cert` frontend locally, mock the Cert API, and test the full SSO + data flow without hitting production?"**

---

# 2. Scope

## Owns

- Local mock API server (Express) mirroring Cert API endpoints
- Seed data (realistic LOA events, certificates, templates, users)
- Local dev workflow (`next dev` + mock server)
- Playwright e2e against the mock server
- Mock-to-live handoff mechanism

## Does Not Own

- Production deployment (see `specs/deployment/`)
- Cert API implementation (`cert-api.lyceumalabang.edu.ph`)
- Auth Platform implementation (`auth.lyceumalabang.edu.ph`)

---

# 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│  Local Development                                   │
│                                                      │
│  ┌──────────────┐         ┌───────────────────────┐  │
│  │ next dev      │◄────────│ mock/server.ts         │  │
│  │ :3000         │  rewrite │ :3001                  │  │
│  │               │          │ Express + db.json     │  │
│  │ /api/v1/*     │────────▶│                        │  │
│  └──────────────┘         └───────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Playwright e2e                                │    │
│  │ starts both, runs tests against :3000         │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

# 4. Mock Server Setup

## 4.1 Implementation

The mock server (`mock/server.ts`) is a standalone Express server that:

1. Loads seed data from `mock/db.json`
2. Serves CRUD endpoints for all resource collections
3. Implements custom handlers for non-CRUD endpoints (auth callback, PDF download, bulk operations, etc.)
4. Wraps all JSON responses in the Cert API envelope format (`{ data: ... }`)
5. Returns binary responses (PDFs) as proper streams

**Built with:** Express 5.x, TypeScript

## 4.2 Installation

```bash
npm install -D express
```

Express is already in devDependencies (added for the mock server).

## 4.3 File Structure

```
mock/
├── server.ts              # Express entry point with all route handlers
├── db.json                # Seed data (realistic LOA data)
└── .gitignore             # Ignores runtime db.json mutations
```

All route handlers and helpers are in the single `server.ts` file for simplicity. The file is ~600 lines but keeps the mock self-contained and easy to run.

---

# 5. Seed Data (`mock/db.json`)

Realistic LOA data matching the Cert API schema:

```json
{
  "events": [
    {
      "id": "1",
      "name": "2026 Commencement Exercises",
      "description": "Annual commencement ceremony for the Lyceum of Alabang",
      "status": "active",
      "event_date": "2026-04-15T08:00:00Z",
      "venue": "Lyceum of Alabang Auditorium",
      "created_by": "admin-uuid-001",
      "created_at": "2026-01-15T08:00:00Z",
      "updated_at": "2026-03-20T14:30:00Z"
    },
    ...
  ],
  "event_attendees": [...],
  "certificates": [...],
  "templates": [...],
  "audit_logs": [...],
  "sequences": [...]
}
```

---

# 6. Vercel Rewrite for Local Dev

The `next.config.ts` rewrite routes `/api/v1/*` to the mock server in dev and the live Cert API in production:

```typescript
// next.config.ts
async rewrites() {
  if (process.env.NEXT_PUBLIC_CERT_API_TARGET === "live") {
    return [{
      source: "/api/v1/:path*",
      destination: "https://cert-api.lyceumalabang.edu.ph/api/v1/:path*",
    }];
  }
  // Default: local mock server
  return [{
    source: "/api/v1/:path*",
    destination: "http://localhost:3001/api/v1/:path*",
  }];
}
```

---

# 7. Mock-to-Live Handoff

## 7.1 How It Works

The handoff is controlled entirely by the `NEXT_PUBLIC_CERT_API_TARGET` environment variable:

| Value | Behavior | When |
|-------|----------|------|
| `mock` (default in `.env.local`) | Rewrite `/api/v1/*` → `localhost:3001` | Local dev, Playwright tests |
| `live` | Rewrite `/api/v1/*` → `cert-api.lyceumalabang.edu.ph` | When C-Auth phase complete |

## 7.2 What Changes When Switching to Live

**Zero code changes.** The mock server and the live Cert API have identical:

- Endpoint paths (`/api/v1/*`)
- Response envelope format (`{ data: ..., meta?: ..., status?: "error" }`)
- Error shape (`{ status: "error", message: string, errors?: {...} }`)
- Auth flows (callback returns `{ access_token, expires_in }`)

The only difference: the mock always succeeds, while the live API enforces real authorization.

## 7.3 When to Switch

Switch `NEXT_PUBLIC_CERT_API_TARGET=live` when:
- Phase C + C-Auth are complete
- Cert API has `jwt.auth`/`jwt.endpoint` middleware deployed
- Auth Platform has the `loa` tenant, cert catalog, and seed groups configured (per Auth runbook `cert-readiness.md`)

---

# 8. Local Env

```env
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_BASE_URL=https://auth.lyceumalabang.edu.ph
NEXT_PUBLIC_CERT_TENANT_SLUG=loa
NEXT_PUBLIC_CERT_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_CERT_API_TARGET=mock
```

---

# 9. Dev Workflow

```bash
# Combined dev (mock + Next.js)
npm run dev:local

# Standalone mock (for testing endpoints)
npm run mock:start

# Browser: http://localhost:3000
```

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:local": "npx concurrently \"npm run mock:start\" \"npm run dev\"",
    "mock:start": "npx tsx mock/server.ts",
    "test:e2e": "npx playwright test"
  }
}
```

---

# 10. Playwright Integration

Playwright starts the mock server before running tests:

```typescript
// playwright.config.ts
export default defineConfig({
  webServer: [
    {
      command: "npm run mock:start",
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

---

# 11. Auth Mock

For local dev and e2e, the SSO flow is mocked by a **mock Auth Platform** server (port 3002) that simulates `auth.lyceumalabang.edu.ph`:

**SSO Flow (simulated):**
1. App redirects unauthenticated user to `http://localhost:3002/sso/login?redirect=http://localhost:3000`
2. Mock Auth Platform shows a login page with quick-login links for test users
3. User clicks a link (or submits form with credentials)
4. Mock Auth Platform redirects back to the app with `#payload=<base64url>&state=<state>`
5. App's SSO fragment handler processes the payload → POSTs to `/api/v1/auth/callback` → stores token

**Direct auth (for testing convenience):**
- `POST /api/v1/auth/tokens` with `{ email, password }` — returns access_token + sets refresh cookie
- This bypasses the SSO redirect chain for fixture setup

**Auth endpoints on mock server (port 3001):**

| Endpoint | Mock Behavior |
|----------|---------------|
| `GET /api/v1/auth/sso/login` | Returns SSO redirect URL to mock Auth Platform |
| `POST /api/v1/auth/callback` | Accepts `{ payload }`, returns access_token + sets httpOnly refresh cookie |
| `POST /api/v1/auth/tokens` | Direct token issuance by email+password (bypass SSO) |
| `POST /api/v1/auth/refresh` | Validates refresh cookie, issues new access token |
| `POST /api/v1/auth/logout` | Clears session + refresh cookie |
| `GET /api/v1/auth/access` | Returns current session user info |
| `GET /api/v1/auth/test-users` | Lists available test users |

**Test users:**

| Email | Permissions | Role | Password |
|-------|-------------|------|----------|
| `admin@test.com` | `admin:/api/v1/*` | admin | admin |
| `staff@test.com` | `write:/api/v1/events`, `read:/api/v1/*` | staff | staff |
| `participant@test.com` | `read:/api/v1/me/certificates` | participant | participant |

JWT is a mock token (base64url encode, no real signature) — the client never verifies it.

**SSO Quick login URL pattern:**
```
http://localhost:3002/sso/login?redirect=http://localhost:3000&email=admin@test.com&password=admin
```

---

# 12. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Hitting production Cert API from local dev | Tests should be isolated; no cross-env contamination |
| Hardcoded URLs in tests | Use `NEXT_PUBLIC_CERT_API_TARGET` to control routing |
| Mocking in `src/` | Mock layer is `mock/`, separate from app code |
| Complex mock logic | Keep handlers simple; the mock mirrors the contract, not business logic |

---

# 13. Guiding Principle

> **One mock server, one truth.** The Express server mirrors the Cert API for local dev and e2e tests. Flipping `NEXT_PUBLIC_CERT_API_TARGET=live` points to the real API with zero code changes.
