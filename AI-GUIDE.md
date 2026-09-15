# AI-GUIDE.md

# LOA e-cert Frontend
## AI Development Guide

**Version:** 1.0
**Audience:** AI Coding Agents, Engineers, Architects

---

# Purpose

This document defines the architectural rules that AI development agents must follow when generating, modifying, or refactoring code within the LOA e-cert Frontend.

The primary objective is to ensure that all generated code respects the CSR architecture, the spec-first gate, and the dependency boundary between e-cert (consumer) and the Cert/Auth Platforms (providers).

When uncertain, AI should preserve architectural integrity over implementation convenience.

---

# ⛔ MANDATORY RULE: Run Tests Before Commit

**The AI agent MUST run the test suite after any code change and before committing.**

This is a hard requirement. Violations are treated as failures.

## The Rule

```
Code changed
  ├── Run the full test suite
  ├── All tests pass  → proceed (commit, continue, etc.)
  ├── Some tests fail → FIX the failures before proceeding
  └── Tests not available → ask the user how to verify
```

## How to Run Tests

```bash
# Unit / integration tests (Vitest)
npx vitest run

# Single test file
npx vitest run src/path/to/file.test.ts

# Specific test name
npx vitest run -t "test name"

# E2E tests (Playwright)
npx playwright test

# Single e2e file
npx playwright test tests/path/to/file.spec.ts
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

This is a hard requirement. Violations are treated as failures.

## The Rule

```
Task received
  ├── Search repo for relevant spec (.md file)
  ├── No spec found      → WRITE THE SPEC FIRST (or ask the user)
  ├── Spec found, Draft  → COMPLETE THE SPEC FIRST
  └── Spec found, Final  → write code that matches the spec exactly
```

## Non-Negotiable Checklist

- [ ] I searched `specs/` for a relevant spec
- [ ] I read the entire relevant spec file(s)
- [ ] The spec is Final (not Draft) before I write production code
- [ ] My code matches the spec's concepts, rules, and contracts
- [ ] No spec exists → I did NOT code; I wrote the spec or asked first

**If the task has no spec and no prior user discussion, the AI agent MUST ask before writing any code.**

---

# ⛔ MANDATORY RULE: No Auto-Pilot — Always Ask

**The AI agent MUST NOT act autonomously. Every significant action requires explicit user confirmation.**

This is a strict behavioral rule, not a suggestion. Violations are treated as failures.

## What Requires User Confirmation

Before taking ANY of the following actions, the AI agent MUST ask and receive an explicit "yes" or specific instruction from the user:

- Writing, modifying, or deleting code files
- Creating, modifying, or deleting spec files
- Installing or updating packages (npm, pnpm)
- Updating `.env` files or secrets
- Running tests (Playwright, Vitest)
- Committing or pushing changes
- Running the dev server (`npm run dev`)
- Any action that changes the state of the repository or running services

## What This Means in Practice

```
User gives a task
  ├── STOP. Do not auto-execute.
  ├── Propose what you plan to do
  ├── Ask the user to confirm
  ├── Wait for explicit response
  └── Only then proceed with confirmed action
```

## The Rule

**No auto-piloting. No assumption-based action. No "I'll just do this real quick."**

If unsure whether an action requires confirmation → **ask anyway**.

If the user says "do X" and you think Y is also needed → **ask about Y, don't just do it**.

If you've already started and realize you should have asked → **stop, report what you did, ask for confirmation on remaining work**.

---

# Core Philosophy

e-cert is a **consumer** of the Cert Platform API and Auth Platform SSO. It owns presentation logic and client-side state — never business rules, identity, or data ownership.

The frontend is a thin client: it renders what the API returns, delegates auth to the SSO flow, and stores nothing sensitive beyond an in-memory access token.

---

# Architecture

```
┌───────────────────────────────────────────────────────┐
│                    e-cert (Next.js CSR)                │
│                                                       │
│  Pages / Components  →  API Client  →  BFF Proxy      │
│       (UI)              (typed)       (path+qs pass)  │
│                                                       │
│  Auth: SSO redirect → in-memory token → JWT claims    │
└───────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐     ┌──────────────────────────┐
│  Auth Platform   │     │     Cert Platform API     │
│  (SSO + users)   │     │     (certs, events, etc.) │
└──────────────────┘     └──────────────────────────┘
```

## Dependency Direction

```
e-cert (consumer)
    ↓ calls
Cert Platform API (provider)
    ↓ calls
Auth Platform (SSO + identity)
```

e-cert never owns business concepts. It references them by API contract only.

---

# CSR Architecture Rules

## No Server-Side Auth

- No httpOnly session cookie
- No server-side JWT verification
- No proxy middleware (`src/proxy.ts` must be deleted)

## No Server Actions

- All data operations through client-side API calls
- No Next.js server actions for mutations

## In-Memory Only

- Access token lives in JS memory only
- Never `localStorage` or `sessionStorage`
- Refresh token stays httpOnly (Cert-managed)

## No Local Identity

- No signing tokens
- No password hashes
- No users table

## Env Contract (4 vars only)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | UI origin |
| `NEXT_PUBLIC_AUTH_BASE_URL` | SSO login redirect |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | JWT tenant validation |
| `NEXT_PUBLIC_CERT_API_TARGET` | `mock` or `live` (rewriting target) |

---

# File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Authenticated routes
│   ├── (participant)/      # Public participant routes
│   ├── api/                # BFF proxy (path+qs pass-through)
│   └── view/               # Public cert viewer
├── features/               # Feature modules (co-located logic)
│   ├── auth/               # SSO fragment, token management
│   ├── events/             # Event management features
│   ├── certificates/       # Certificate features
│   └── templates/          # Template editor
├── lib/                    # Shared utilities
│   ├── api/                # Typed Cert API client
│   └── env.ts              # Environment validation
├── components/             # Shared UI components
├── types/                  # Shared TypeScript types
└── specs/                  # Specifications (source of truth)
```

---

# Dependency Rules

| Allowed | Forbidden |
|---------|-----------|
| Components → API client | API client → Components |
| Features → `lib/` utilities | `lib/` → Features |
| Pages → Features | Cross-feature direct imports (use shared types) |
| Any → Cert Platform API (via BFF) | Direct Supabase / database access |
| Any → Auth Platform (SSO redirect) | Token storage in localStorage |

---

# Decision Tree

Before generating code, determine what you're building:

```
1. New page?
   ├── Authenticated → src/app/(dashboard)/
   ├── Public participant → src/app/(participant)/
   └── Public viewer → src/app/view/

2. New feature module?
   ├── Co-locate in src/features/{name}/
   ├── Export only what pages/components need
   └── API calls go through src/lib/api/

3. New API call?
   ├── Add typed method in src/lib/api/{domain}.ts
   ├── Use the BFF proxy (src/app/api/v1/[...path]/route.ts)
   └── Never call Cert API directly from components

4. New shared component?
   ├── src/components/ui/ for primitives (shadcn)
   └── src/components/ for app-level shared components

5. New type?
   ├── src/types/ for shared domain types
   └── Feature-local types stay in the feature dir
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
| Test files | `*.test.ts` or `*.spec.ts` | `attendees.test.ts` |
| Pages | `page.tsx` (Next.js convention) | `src/app/(dashboard)/events/[id]/page.tsx` |

---

# Common Anti-Patterns

| Pattern | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Storing tokens in `localStorage` | XSS can read it | In-memory only |
| Calling Cert API directly from component | Bypasses proxy, leaks origin | Use `src/lib/api/` methods |
| Using server actions | Violates CSR architecture | Client-side API calls |
| Adding httpOnly cookie | Violates in-memory token rule | SSO redirect flow |
| Duplicating API types locally | Drift from backend | Import from `src/lib/api/` types |
| Hardcoding `organization_id` | Org resolved from JWT | Use `tenant.slug` from JWT claims |
| Using `/login` for SSO | `/login` is admin-only | Use `/sso/login` |
| Writing code against Draft spec | Spec must be Final first | Read spec, confirm status |

---

# Testing Strategy

| Layer | Tool | What It Tests |
|-------|------|---------------|
| Unit | Vitest | Pure functions, utilities, type guards |
| Component | Vitest + React Testing Library | Component rendering, user interactions |
| Integration | Vitest | API client ↔ mocked responses |
| E2E | Playwright | Full user flows in browser |

## Test File Location

- Co-located with source: `src/features/events/components/__tests__/attendees.test.ts`
- Or in `e2e/` for Playwright specs

---

# Recurring Gotchas

## BFF Proxy

The BFF proxy (`src/app/api/v1/[...path]/route.ts`) forwards requests to the Cert API with path+query-string intact. It does NOT transform, validate, or enrich. If you see unexpected data, the issue is upstream (Cert API), not the proxy.

## JWT Claims

All role/permission checks derive from the JWT `permissions` claim — never from a database lookup. The `tenant.slug` claim resolves the organization. If you need a new permission, it must be added to the Cert Platform permission registry, not hardcoded in e-cert.

## Environment Variables

Only 4 `NEXT_PUBLIC_*` vars are allowed. If you need a new env var, ask first — the contract is tight by design.

---

# Guiding Principle

Every piece of generated code should strengthen the architecture rather than weaken it.

If a solution is easier but violates the CSR boundary, the spec-first gate, or the dependency direction, it is the wrong solution.

Correct architecture takes precedence over implementation convenience.

When uncertain:

Specs before code.

Client-side only.

Ask before acting.
