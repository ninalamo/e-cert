# LOA VERICERT

Digital certificate management SPA for organizations. Built with Next.js (App Router) as a client-side rendered (CSR) application that delegates all data operations and authentication to the Cert Platform.

## Architecture

This is a **pure client-side application**. There is no local identity, no server-side auth, no server actions, and no database access from the frontend.

| Concern | Where |
|---------|-------|
| Auth flow | SSO redirect via `/sso/login` → httpOnly refresh token → in-memory access token |
| Role resolution | Derived from JWT `permissions` claim |
| Data access | Typed Cert API client (`src/lib/api/`) — all operations client-side via Vercel rewrite |
| Organization | Resolved from JWT `tenant.slug` |
| Token storage | JS memory only (never `localStorage`/`sessionStorage`) |

### Cert API Client

All data operations go through the typed API client in `src/lib/api/`:

| Module | Responsibility |
|--------|---------------|
| `client.ts` | Base HTTP client (fetch wrapper, auth injection, 401 refresh retry, PDF blob handling) |
| `events.ts` | Event CRUD + stats + template clone |
| `attendees.ts` | Attendee CRUD + JSON import + file data |
| `templates.ts` | Template CRUD (certificate + email types) |
| `certificates.ts` | Issue + bulk + upload + PDF + revoke + email + view |
| `dashboard.ts` | Stats + recent activity |
| `audit.ts` | Audit logs query + export |
| `verify.ts` | Public verify + view (no auth) |
| `types.ts` | Shared response types, pagination, error envelope |

Browser calls `/api/v1/*` → Vercel rewrites to Cert Platform API.

### Env Contract (4 vars only)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | UI origin |
| `NEXT_PUBLIC_AUTH_BASE_URL` | SSO login redirect |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | JWT tenant validation |
| `NEXT_PUBLIC_CERT_API_TARGET` | `mock` or `live` (rewriting target) |

---

## User Roles

Roles are derived from the JWT `permissions` claim — never from a database lookup.

| Role | Description |
|------|-------------|
| **Admin** | Full access to all features |
| **Staff** | (Reserved) |
| **Participant** | View own profile and certificates |
| **Guest** | Unauthenticated; certificate verification only |

---

## User Stories

### Events

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| E-1 | Admin | Create an event with a name, date, and location | I can organize certificate issuances |
| E-2 | Admin | Update an event's details | I can correct or modify event information |
| E-3 | Admin | Delete an event | I can remove events that are no longer needed |

### Certificates

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| C-1 | Admin | View all certificates across the organization | I can audit and manage issued certificates |
| C-2 | Admin | Create a certificate by mapping it to an event template | I can issue certificates for an event |
| C-3 | Admin | Update a certificate's details | I can correct errors on issued certificates |
| C-4 | Admin | Delete a certificate | I can revoke access to invalid certificates |
| C-5 | Admin | Issue certificates to participants in bulk via CSV upload (name, email) | I can onboard many participants at once without manual entry |
| C-6 | Admin | Assign a certificate using a CSV (name, email, PDF path) | I can override auto-generated certificates with custom PDFs |
| C-7 | Admin | Revoke a single certificate | I can invalidate a specific certificate |
| C-8 | Admin | Revoke certificates in batch | I can revoke multiple certificates at once |
| C-9 | Participant | View only my own certificates | I can access my issued certificates |
| C-10 | Guest | Verify a certificate by its certificate number | I can confirm if a certificate is valid |

### Participant Profile

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| P-1 | Participant | View my own profile (name, email, role) | I can confirm my account details |

### Authentication

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| A-1 | Guest | Log in via SSO | I can access my dashboard |
| A-2 | Authenticated user | Log out | I can end my session securely |

---

## Routes

### Public Pages (No Authentication Required)

| Route | Description |
|-------|-------------|
| `/sso/login` | SSO login redirect entry point |
| `/verify` | Verify a certificate by number |

### Protected Pages (Authentication Required)

All authenticated users (any role) can access:

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview / home |
| `/events` | List, create, edit, delete events |
| `/events/[id]` | Event detail (attendees, certificates) |
| `/events/[id]/upload` | Upload CSV of participants |
| `/events/[id]/issue` | Issue certificates for event |
| `/dashboard/certificates` | List all certificates |
| `/dashboard/templates` | Certificate template editor |
| `/my` | Participant home |
| `/my/profile` | View own profile |
| `/my/certificates` | View own certificates |

---

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Linting

```bash
npm run lint
```

---

## Anti-Patterns

See `AI-RULES.md` for the full list. Key violations:

- **Direct Supabase/PostgREST calls** — all data access goes through the Cert API client
- **Server actions** — all mutations are client-side API calls
- **Local identity** — no signing tokens, no password hashes, no users table
- **localStorage/sessionStorage** — tokens live in JS memory only
- **Proxy middleware** — no `src/proxy.ts`, no server-side session resolution