# AI-GUIDE.md

# LOA e-cert Frontend
## AI Development Guide

**Version:** 2.0
**Audience:** AI Coding Agents, Engineers, Architects

---

# Purpose

This document defines the architectural rules AI agents must follow when generating, modifying, or refactoring code in the LOA e-cert frontend.

e-cert is a **spec-driven, client-side SPA**: it renders what the Cert API returns, delegates identity to Auth SSO, and owns no business rules, identity, or data. Spec pattern is a lightweight frontend-only adaptation of `loa-apache-server-apps` — `views` / `features` / `ui` / `services`. No kernels, domains, or contexts here.

When uncertain, preserve architectural integrity over implementation convenience.

---

# ⛔ MANDATORY RULE: Run Tests Before Commit

**The AI agent MUST run the test suite after any code change and before committing.**

```
Code changed
  ├── Run the full test suite
  ├── All tests pass  → proceed (commit, continue, etc.)
  ├── Some tests fail → FIX the failures before proceeding
  └── Tests not available → ask the user how to verify
```

## How to Run Tests

```bash
# Unit / integration / component (Vitest)
npx vitest run

# Single test file
npx vitest run src/path/to/file.test.ts

# E2E (Playwright, mock-backed)
npx playwright test

# Single e2e file
npx playwright test e2e/tests/path/to/file.spec.ts
```

## Non-Negotiable Checklist

- [ ] I ran the test suite after my code change
- [ ] All tests pass (zero failures, zero errors)
- [ ] If I broke a test, I fixed it before moving on
- [ ] If tests are slow, I ran at least the affected test file

**No code change is complete until tests pass.**

---

# ⛔ MANDATORY RULE: Specs Before Code

**The AI agent MUST check for and read the spec before writing ANY code.**

```
Task received
  ├── Search specs/views, specs/features, specs/ui, specs/services for the relevant spec
  ├── No spec found      → WRITE THE SPEC FIRST (copy specs/_template.md) or ask the user
  ├── Spec found, Draft  → COMPLETE THE SPEC FIRST
  └── Spec found, Final  → write code that matches the spec exactly
```

## Non-Negotiable Checklist

- [ ] I searched `specs/` for a relevant spec
- [ ] I read the entire relevant spec file(s)
- [ ] The spec is Final (not Draft) before I write production code
- [ ] My code matches the spec's UI contract, API calls, and rules
- [ ] No spec exists → I did NOT code; I wrote the spec or asked first

**If the task has no spec and no prior user discussion, the AI agent MUST ask before writing any code.**

---

# ⛔ MANDATORY RULE: No Auto-Pilot — Always Ask

**The AI agent MUST NOT act autonomously. Every significant action requires explicit user confirmation.**

Before taking ANY of the following actions, the AI agent MUST ask and receive an explicit "yes" or specific instruction:

- Writing, modifying, or deleting code files
- Creating, modifying, or deleting spec files
- Installing or updating packages (npm)
- Updating `.env` files or secrets
- Running tests (Playwright, Vitest)
- Committing or pushing changes
- Running the dev server (`npm run dev`)
- Any action that changes the state of the repository or running services

```
User gives a task
  ├── STOP. Do not auto-execute.
  ├── Propose what you plan to do
  ├── Ask the user to confirm
  ├── Wait for explicit response
  └── Only then proceed with confirmed action
```

**No auto-piloting. No assumption-based action. No "I'll just do this real quick."**

---

# Core Philosophy

e-cert is a **consumer** of the Cert Platform API and Auth Platform SSO. It owns presentation logic and client-side state — never business rules, identity, or data ownership.

```
┌───────────────────────────────────────────────────────┐
│                    e-cert (Next.js CSR)                │
│                                                       │
│  Views → Features → UI primitives                     │
│       └→ Services (api-client, auth) → BFF → Cert API │
│                                                       │
│  Auth: SSO redirect → in-memory token → JWT display   │
└───────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐     ┌──────────────────────────┐
│  Auth Platform   │     │     Cert Platform API     │
│  (SSO + users)   │     │     (certs, events, etc.) │
└──────────────────┘     └──────────────────────────┘
```

e-cert never owns business concepts. It references them by API contract only (`specs/openapi/cert-api.yaml`).

---

# Spec Layers (frontend-only)

| Layer | Lives in | Specs in | Owns |
|-------|----------|----------|------|
| `views` | `src/app/` | `specs/views/` | routes, gating, which feature renders where. No data logic. |
| `features` | `src/features/*` | `specs/features/` | UI workflows: events, certificates, templates, dashboard, audit, faq. One spec per feature. |
| `ui` | `src/components/` | `specs/ui/` | dumb shared primitives + empty/error states. No fetching, no feature knowledge. |
| `services` | `src/lib/api/`, `src/lib/auth/`, config | `specs/services/` | plumbing: api-client, auth, platform (env/deploy), testing. No business logic. |

Decisions: `specs/decisions/` (D1 CSR, D2 BFF, D3 JWT-display, D4 fresh-start). New spec? Copy `specs/_template.md` (Purpose, Scope, UI Contract, API Calls, Rules, Tests, Anti-Patterns — lightweight by design).

---

# Architecture Rules (CSR)

## No Server-Side Auth

- No httpOnly session cookie, no server-side JWT verification, no `src/proxy.ts`.

## No Server Actions

- All data operations through client-side API calls (`src/lib/api/` via BFF).

## In-Memory Only

- Access token in JS memory only. Never `localStorage`/`sessionStorage`. Refresh stays httpOnly (Cert-managed).

## No Local Identity

- No signing tokens, no password hashes, no users table.

## Env Contract (canonical Vercel set + local BFF targets)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | UI origin |
| `NEXT_PUBLIC_AUTH_BASE_URL` | SSO login redirect |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | JWT tenant display check |
| `NEXT_PUBLIC_CERT_API_URL` | legacy, unread by code — do not use |
| `CERT_API_URL` | BFF → Cert host (server-only; unset on Vercel → production fallback) |
| `AUTH_API_URL` | BFF → Auth host (server-only; unset on Vercel → production fallback) |

Exact values: `specs/services/vercel-deploy.md`.

---

# File Organization

```
src/
├── app/                    # views (routes; render features, no fetching)
│   ├── (dashboard)/        # authenticated routes
│   ├── (participant)/      # participant routes
│   ├── api/v1/[...path]/  # BFF proxy (no logic; see specs/services/api-bff-layer.md)
│   ├── api/events/[...path]/ # legacy bulk-ops proxy (same)
│   ├── verify/, view/, faq/
├── features/               # events, certificates, templates, dashboard, audit, faq
├── lib/api/                # typed Cert API client (one module per resource)
├── lib/auth/               # sso-fragment, token-store, session-ready, jwt, guard
├── components/             # shared ui/ only
└── types/                  # shared types (cross-feature sharing goes here)
specs/
├── _template.md  views/  features/  ui/  services/  decisions/  openapi/
```

---

# Dependency Rules

Full matrix: `dependency-rules.md`. Summary:

| Allowed | Forbidden |
|---------|-----------|
| views → features | features → views |
| views → services | only the two documented exceptions (users page, event bulk ops) |
| features → ui, services, types | ui → features/services; services → features/views/ui |
| features → `lib/api`, `lib/auth` | cross-feature direct imports |
| any → Cert API via BFF; → Auth SSO redirect | direct Supabase/DB; `localStorage` tokens; server actions |

---

# Decision Tree

```
1. New page?          → specs/views/ → src/app/ (guard + render feature; fetch only via features/services — see the two documented exceptions)
2. New feature flow?  → specs/features/{name}.md → src/features/{name}/ (API via src/lib/api/)
3. New API call?      → specs/services/api-client.md → src/lib/api/{resource}.ts via BFF, never direct
4. New shared visual? → specs/ui/ → src/components/ui/ (props only, no fetch)
5. New plumbing?      → specs/services/ (token, env, test — no business logic)
6. No spec?           → write it first (specs/_template.md), get it to Final, then code
```

---

# Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase files | `AttendeeManager.tsx` |
| Hooks | `use` prefix, camelCase | `useAttendees.ts` |
| API modules | camelCase, plural | `attendees.ts`, `certificates.ts` |
| Types | PascalCase, singular | `EventAttendee`, `Certificate` |
| Spec files | kebab-case, `.md` | `attendee-deletion.md` |
| Test files | `*.test.ts` / `*.spec.ts` | `attendees.test.ts` |
| Pages | `page.tsx` (Next.js) | `src/app/(dashboard)/events/[id]/page.tsx` |

---

# Common Anti-Patterns

| Pattern | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Storing tokens in `localStorage` | XSS-readable | in-memory only |
| Calling Cert API directly from component | bypasses BFF + typing | `src/lib/api/` module |
| Server actions | violates CSR | client-side calls |
| httpOnly session cookie | violates in-memory rule | SSO redirect flow |
| Duplicating API types locally | drift | import from `src/lib/api/` types |
| Hardcoding `organization_id` | org from JWT | omit; server resolves |
| Using `/login` for SSO | admin-only | `/sso/login` |
| Coding against a Draft spec | gate violation | finalize spec first |

---

# Testing Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | pure functions, guards, parsers |
| Component | Vitest + RTL | rendering, interaction, states |
| Integration | Vitest | api-client ↔ mocked envelope |
| E2E | Playwright + mock (`mock/server.ts`) | full flows in browser |

Tests live in `src/__tests__/` (Vitest, `src/**/*.test.ts`) and `e2e/tests/` (Playwright). Mock (`mock/server.ts` + `mock/db.json`) mirrors the Cert contract. Known gap: BFF port alignment for mock-backed runs — see `specs/services/testing.md` §4.

---

# Recurring Gotchas

- **BFF is dumb (two routes).** They forward path+query as-is (`/api/v1/*`, legacy `/api/events/*`). Bad data = upstream (Cert API), not the proxy. Auth routing detail: only non-callback/refresh/logout `auth/*` goes to Auth; the rest goes to Cert.
- **JWT is display-only.** Roles/tenant from claims gate UI; Cert API enforces. New permission = Cert catalog change, never hardcoded.
- **Fixed env set.** New var needed? Ask first — values table is `specs/services/vercel-deploy.md`.

---

# Guiding Principle

> Specs before code. Client-side only. Ask before acting.
