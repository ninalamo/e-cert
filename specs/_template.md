# Spec Template (frontend-only, lightweight)

**Version:** 1.0
**Status:** Draft | Final
**Layer:** `views` | `features` | `ui` | `services`
**Audience:** Engineers, AI Development Agents

> Copy this file for every new spec. Delete sections that don't apply, but keep the header + Purpose + Scope.

---

# 1. Purpose

It answers:

> **"..."**

One paragraph. What UI problem this solves, for whom.

---

# 2. Scope

## Owns

- What this spec governs (routes, components, API modules).

## Does Not Own

- What lives elsewhere (Cert API logic, Auth UI, other specs). Reference by name, do not duplicate.

---

# 3. UI Contract

Routes, components, states (loading / empty / error). Keep it concrete:

| Item | Location | Notes |
|------|----------|-------|
| `/example` | `src/app/.../page.tsx` | what it renders |
| `ExampleCard` | `src/features/.../components/...` | props, states |

---

# 4. API Calls

Every Cert API call this UI makes (client-side only, via BFF `/api/v1/*`):

| Action | Method + Path | Auth |
|--------|---------------|------|
| List X | `GET /api/v1/x` | `read` |

No Supabase. No server actions. No `organization_id` (org from JWT `tenant.slug` server-side).

---

# 5. Rules

Invariants the UI must enforce (role gates, visibility, validation). Short bullets.

- Example: `admin`-only delete; JWT `permissions` claim drives gating, Cert API enforces.

---

# 6. Tests

How this is verified (Playwright spec + mock endpoint):

- [ ] `e2e/tests/...spec.ts` — scenario → expected.

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Calling Cert API directly from component | Use `src/lib/api/` typed module via BFF |

---

# 8. Guiding Principle

> One sentence summary.
