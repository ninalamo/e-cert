# E-Cert

Digital certificate management system for organizations. Built with Next.js (App Router) and Supabase.

## User Roles

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
| A-1 | Guest | Register a new account | I can create a participant account |
| A-2 | Guest | Log in with my email and password | I can access my dashboard |
| A-3 | Guest | Request a password reset | I can recover access if I forget my password |
| A-4 | Authenticated user | Log out | I can end my session securely |

---

## Public Pages (No Authentication Required)

| Route | Description |
|-------|-------------|
| `/login` | Sign in to an existing account |
| `/register` | Create a new participant account |
| `/forgot-password` | Request a password reset email |
| `/verify` | Verify a certificate by number |

---

## Protected Pages (Authentication Required)

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

## Seeded Users

| Email | Password | Role |
|-------|----------|------|
| admin@lyceumalabang.edu.ph | password123 | admin |
| staff@lyceumalabang.edu.ph | password123 | staff |
| participant@lyceumalabang.edu.ph | password123 | participant |

Reseed via `PUT http://localhost:3000/api/health` (localhost only).

---

## Architecture

### Proxy (Next.js 16)

This project uses Next.js 16's `proxy.ts` — **not** the legacy `middleware.ts` pattern. All request-level concerns (CSRF validation, rate limiting, session resolution) are handled in `src/proxy.ts`.

The proxy runs on every non-static request and:

1. Validates CSRF tokens on POST requests.
2. Enforces rate limits on sensitive API routes.
3. Authenticates the user via Supabase and resolves their role from `user_memberships`.
4. Sets `x-user-id`, `x-user-email`, `x-user-name`, and `x-user-role` headers so server components read session data from headers with zero additional DB calls.

`getCurrentSession()` in `src/lib/permissions.ts` reads these headers directly. The fallback path (no proxy headers) exists only for edge cases outside the normal request lifecycle.

---

## Known Issues & Fixes

### Template Editor: CSS/HTML Changes Lost on Mode Switch (Fixed)

**Symptom:** Editing CSS/HTML in Design mode (via the canvas) and switching to Advanced mode caused changes to disappear when switching back.

**Root cause:** The canvas sync (`elementsToHtml → onChange`) ran inside a `useEffect`. When the user switches to Advanced mode, React unmounts the canvas component. If the `useEffect` hadn't fired yet (due to batched state updates), the parent's `htmlContent` state never received the latest canvas output. When switching back to Design mode, the canvas re-parsed stale `htmlContent`, discarding the edits.

**Fix:** Moved the sync from a `useEffect` to a **during-render** block at `template-canvas.tsx:481–490`. The HTML is computed synchronously during render and written to a ref (`lastCanvasHtml`). A `queueMicrotask` defers the `onChange` call to after the current commit but before the browser paints — ensuring the parent receives the update even if the canvas unmounts in the same render cycle.

**Key files:**
- `src/features/templates/components/template-canvas.tsx` — canvas component, render-time sync block
- `src/features/templates/components/template-form.tsx` — template form, source panel UI
- `src/components/ui/code-editor.tsx` — `readOnly` prop for interactive source editors

---

## Troubleshooting

### `permission denied for table users` (SQL 42501)

**Symptom:** Supabase logs show `permission denied for table users` when querying `certificates`. The RLS policy references `auth.users` but the `authenticator` role lacks SELECT on it.

**Cause:** The `auth.users` table is missing grants for `authenticated`/`anon`/`service_role`. This can happen on projects set up outside the dashboard (CLI, self-hosted, or imported schemas).

**Verify:**

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'auth' AND table_name = 'users';
```

If `authenticated`, `anon`, or `service_role` are missing `SELECT`:

**Fix:**

```sql
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO service_role;
GRANT SELECT ON auth.users TO anon;
```

> **Note:** These grants are managed by the Supabase platform, not app migrations. Do not add them to `schema.sql` — they are redundant on healthy projects.

---

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
