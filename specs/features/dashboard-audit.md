# Dashboard + Audit

**Version:** 1.0
**Status:** Final
**Layer:** `features/dashboard+Audit`
**Audience:** Engineers, AI Development Agents

---

# 1. Purpose

It answers:

> **"What do staff see on landing (stats + activity) and how do admins trace actions?"**

---

# 2. Scope

## Owns

- `src/features/dashboard/` (stats cards, recent activity), `src/features/audit/` (log list + export), `src/features/faq/` (static).

## Does Not Own

- Stats computation or audit retention (Cert Platform).

---

# 3. UI Contract

| Item | Location | Notes |
|------|----------|-------|
| dashboard | `src/app/(dashboard)/dashboard` | read-only cards from `GET /dashboard/*` |
| audit | `src/app/(dashboard)/audit` | `admin` only |
| faq | `src/app/faq` + `src/features/faq/` | static, public |

---

# 4. API Calls

| Action | Method + Path | Auth |
|--------|---------------|------|
| stats/activity | `GET /dashboard/*` | `read` |
| logs/export | `GET /admin/audit-logs` | `admin` |

---

# 5. Rules

- Dashboard/audit read-only from server; audit admin-only.
- Exception: `user-activity` badges derive the summary client-side (`userActivityApi` over `/certificates?recipient_email=` + `/attendees/lookup`) — display aid only, never a permission source.

---

# 6. Tests

- [ ] `src/__tests__/phase-h/audit-consistency.test.ts` (Vitest, exists) — audit action/source shapes.
- [ ] Planned e2e: stats + audit suites (see `../services/testing.md`).

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Gating audit by hiding link only | Guard the route + rely on API 403 |

---

# 8. Guiding Principle

> **Summarize, don't compute.** Counts come from Cert; UI displays them.
