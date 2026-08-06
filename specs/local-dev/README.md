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

- Local mock API server (JSON Server) mirroring Cert API endpoints
- Seed data (realistic LOA events, certificates, templates, users)
- Local dev workflow (`next dev` + JSON Server)
- Playwright e2e against JSON Server (replaces MSW)

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
│  │ next dev      │         │ json-server            │  │
│  │ :3000         │────────▶│ :3001                  │  │
│  │               │ rewrite │ mock API (db.json)     │  │
│  │ /api/v1/*     │────────▶│ /api/v1/*              │  │
│  └──────────────┘         └───────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Playwright e2e                                │    │
│  │ starts both, runs tests against :3000         │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

# 4. JSON Server Setup

## 4.1 Installation

```bash
npm install -D json-server
```

## 4.2 Mock Server (`mock/server.ts`)

```typescript
// mock/server.ts
import { createServer, Router } from "json-server";
import authRoutes from "./routes/auth";
import eventsRoutes from "./routes/events";
import certificatesRoutes from "./routes/certificates";
import templatesRoutes from "./routes/templates";
import dashboardRoutes from "./routes/dashboard";
import auditRoutes from "./routes/audit";

const server = createServer({ dbname: "db" });
const router = Router("db.json");

// Custom routes (non-CRUD)
authRoutes(router);
eventsRoutes(router);
certificatesRoutes(router);
templatesRoutes(router);
dashboardRoutes(router);
auditRoutes(router);

server.use(router);
server.listen(3001, () => {
  console.log("Mock Cert API running on http://localhost:3001");
});
```

## 4.3 Custom Routes (`mock/routes/*.ts`)

JSON Server's default CRUD doesn't handle nested resources or custom actions. Custom routes extend it:

```typescript
// mock/routes/auth.ts
import type { Router } from "json-server";

export default function authRoutes(router: Router) {
  // SSO callback — returns access token
  router.post("/api/v1/auth/callback", (req, res) => {
    res.json({
      access_token: "mock-jwt-access-token",
      expires_in: 3600,
    });
  });

  // Refresh — returns new access token
  router.post("/api/v1/auth/refresh", (req, res) => {
    res.json({
      access_token: "mock-jwt-access-token-refreshed",
      expires_in: 3600,
    });
  });

  // Logout — clears cookie
  router.post("/api/v1/auth/logout", (req, res) => {
    res.json({ status: "ok" });
  });
}
```

```typescript
// mock/routes/events.ts
import type { Router } from "json-server";

export default function eventsRoutes(router: Router) {
  // Event stats
  router.get("/api/v1/events/:id/stats", (req, res) => {
    const { id } = req.params;
    res.json({
      data: {
        event_id: id,
        total_attendees: 45,
        issued: 30,
        pending: 15,
        revoked: 0,
      },
    });
  });

  // Clone template
  router.post("/api/v1/events/:id/clone-template", (req, res) => {
    res.json({ data: { id: "new-template-id", cloned_from: req.params.id } });
  });
}
```

---

# 5. Seed Data (`mock/db.json`)

Realistic LOA data matching the Cert API schema:

```json
{
  "events": [
    {
      "id": "1",
      "name": "2026 Commencement Exercises",
      "description": "Annual commencement ceremony",
      "status": "active",
      "event_date": "2026-04-15",
      "venue": "Lyceum of Alabang Auditorium",
      "created_by": "admin-uuid-001",
      "created_at": "2026-01-15T08:00:00Z",
      "updated_at": "2026-03-20T14:30:00Z"
    },
    {
      "id": "2",
      "name": "Leadership Training Workshop",
      "description": "Student leadership development",
      "status": "active",
      "event_date": "2026-06-10",
      "venue": "Conference Room A",
      "created_by": "staff-uuid-001",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-05-28T09:15:00Z"
    }
  ],
  "event_attendees": [
    {
      "id": "a1",
      "event_id": "1",
      "name": "Maria Santos",
      "email": "maria.santos@student.loa.edu.ph",
      "certificate_number": "LOA-2026-COM-001",
      "status": "issued",
      "created_at": "2026-02-01T08:00:00Z"
    },
    {
      "id": "a2",
      "event_id": "1",
      "name": "Juan Dela Cruz",
      "email": "juan.delacruz@student.loa.edu.ph",
      "certificate_number": null,
      "status": "pending",
      "created_at": "2026-02-01T08:00:00Z"
    }
  ],
  "certificates": [
    {
      "id": "c1",
      "certificate_number": "LOA-2026-COM-001",
      "event_id": "1",
      "attendee_id": "a1",
      "attendee_name": "Maria Santos",
      "attendee_email": "maria.santos@student.loa.edu.ph",
      "template_id": "t1",
      "status": "issued",
      "issued_at": "2026-04-15T16:00:00Z",
      "issued_by": "admin-uuid-001",
      "created_at": "2026-04-15T16:00:00Z"
    }
  ],
  "templates": [
    {
      "id": "t1",
      "name": "Certificate of Completion",
      "type": "certificate",
      "content": "<h1>Certificate of Completion</h1><p>This certifies that <strong>{{attendee_name}}</strong>...</p>",
      "is_locked": false,
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-01-10T08:00:00Z"
    },
    {
      "id": "t2",
      "name": "Certificate Email Notification",
      "type": "email",
      "content": "<p>Your certificate <strong>{{certificate_number}}</strong> is ready...</p>",
      "is_locked": false,
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-01-10T08:00:00Z"
    }
  ],
  "dashboard_stats": {
    "total_events": 12,
    "total_certificates": 342,
    "total_templates": 8,
    "pending_reviews": 5
  },
  "audit_logs": [
    {
      "id": "al1",
      "action": "certificate.issued",
      "entity_type": "certificate",
      "entity_id": "c1",
      "user_id": "admin-uuid-001",
      "user_email": "admin@loa.edu.ph",
      "details": { "certificate_number": "LOA-2026-COM-001" },
      "created_at": "2026-04-15T16:00:00Z"
    }
  ]
}
```

---

# 6. Vercel Rewrite for Local Dev

The `next.config.js` rewrite routes `/api/v1/*` to the mock server in dev:

```javascript
// next.config.js
async rewrites() {
  const apiBase = process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://cert-api.lyceumalabang.edu.ph";

  return [{
    source: "/api/v1/:path*",
    destination: `${apiBase}/api/v1/:path*`,
  }];
}
```

---

# 7. Local Env

```env
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_BASE_URL=https://auth.lyceumalabang.edu.ph
NEXT_PUBLIC_CERT_TENANT_SLUG=loa
NEXT_PUBLIC_CERT_API_BASE_URL=http://localhost:3001
```

Point `NEXT_PUBLIC_AUTH_BASE_URL` to the real Auth Platform (SSO redirect works locally) or to a mock auth server for full offline dev.

---

# 8. Dev Workflow

```bash
# Terminal 1: Mock API
npm run mock

# Terminal 2: Next.js dev
npm run dev

# Browser: http://localhost:3000
```

Or combined:

```bash
npm run dev:local  # concurrently runs next dev + json-server
```

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "mock": "npx tsx mock/server.ts",
    "dev:local": "concurrently \"npm run mock\" \"npm run dev\"",
    "test": "npx playwright test",
    "test:local": "concurrently \"npm run mock\" \"npm run test\""
  },
  "devDependencies": {
    "json-server": "^3.x",
    "concurrently": "^9.x"
  }
}
```

---

# 9. Playwright Against JSON Server

Playwright starts JSON Server before running tests:

```typescript
// playwright.config.ts
export default defineConfig({
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
});
```

No MSW needed. JSON Server is the single mock layer.

---

# 10. Auth Mock

For local dev and e2e, mock the SSO flow:

```typescript
// mock/routes/auth.ts
router.post("/api/v1/auth/callback", (req, res) => {
  const { payload } = req.body;

  // In dev: ignore payload, return mock token
  // In real: Cert decrypts payload, validates, returns token
  res.json({
    access_token: createMockJWT({
      sub: "test-user-uuid",
      email: "admin@test.com",
      name: "Test Admin",
      groups: ["cert-admin"],
      permissions: ["admin:/api/v1/*"],
      tenant: { id: "test-tenant", slug: "loa" },
    }),
    expires_in: 3600,
  });
});
```

Playwright tests can hit the callback endpoint directly with a mock payload.

---

# 11. File Structure

```
mock/
├── server.ts              # JSON Server entry point
├── db.json                # Seed data
├── routes/
│   ├── auth.ts            # /api/v1/auth/* custom handlers
│   ├── events.ts          # /api/v1/events/* custom handlers
│   ├── certificates.ts    # /api/v1/certificates/* custom handlers
│   ├── templates.ts       # /api/v1/templates/* custom handlers
│   ├── dashboard.ts       # /api/v1/dashboard/* custom handlers
│   └── audit.ts           # /api/v1/admin/* custom handlers
└── helpers/
    └── jwt.ts             # createMockJWT() for dev tokens
```

---

# 12. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Hitting production Cert API from local dev | Tests should be isolated; no cross-env contamination |
| Using MSW + JSON Server together | Pick one mock layer; JSON Server is simpler for this use case |
| Mocking in `src/` | Mock layer is `mock/`, separate from app code |
| Hardcoded URLs in tests | Use `baseURL` from Playwright config |

---

# 13. Guiding Principle

> **One mock server, one truth.** JSON Server mirrors the Cert API for local dev and e2e tests. No MSW, no production calls, no ambiguity.
