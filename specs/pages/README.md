# LOA e-cert — Pages
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — UI Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §9.1–9.2

---

# 1. Purpose

It answers:

> **"Which pages stay, which are removed, and how do they change after the CSR refactor?"**

---

# 2. Pages That Stay (backed by client-side Cert API calls)

| Page | Notes |
|------|-------|
| `/` landing | public |
| `/verify` + `/view/[id]` | public; client calls `/api/v1/verify/{number}` and `/api/v1/view/{id}` |
| `/(dashboard)/dashboard` | stats + activity via client API |
| `/(dashboard)/events*` | list, new, `[id]`, upload, issue; CSV upload via client |
| `/(dashboard)/certificates*` | list, issue, `[id]`; PDF/QR/email via client API |
| `/(dashboard)/templates/certificates*` | TipTap persists via client `PATCH /api/v1/templates` |
| `/(dashboard)/templates/emails*` | same, `type=email` |
| `/(dashboard)/audit` | `admin` endpoints via client API |
| `/(participant)/my`, `my/certificates*` | `/me/certificates*` via client API |

---

# 3. Pages That Are Removed

| Page | Reason |
|------|--------|
| `/(auth)/login`, `register`, `forgot-password`, `update-password` | Auth Platform owns auth UI |
| `/(dashboard)/users` | Auth Platform owns user management |
| `/(dashboard)/templates/auth-emails*` | Auth email templates belong to Auth Platform |
| `/(participant)/my/profile` (email update) | Email/identity managed by Auth Platform |

---

# 4. Feature Semantics Changes

| Legacy behavior | New behavior |
|-----------------|--------------|
| Server actions for all mutations | Client-side `fetch()` to Cert API |
| Async workflow for issue/reissue | Synchronous bulk results — no polling |
| Client-side PDF render + `save-pdf` | PDF generated/streamed by Cert; client fetches/downloads |
| Auth email templates & SMTP in the app | Email templates + sending live in Cert |
| `organization_id` in every action | Omitted; org resolved from JWT `tenant.slug` |
| Local `user_memberships` role lookup | JWT `permissions` claim → role |

---

# 5. Component Changes

| Component | Change |
|-----------|--------|
| All `server/*.actions.ts` files | **Delete** — replaced by `src/lib/api/*` modules |
| All `server/*.service.ts` files | **Delete** — logic moves to API client |
| All `server/*.repository.ts` files | **Delete** — replaced by API client |
| React components | **Keep** — but change data fetching from server actions to client API calls |
| Page components | **Keep** — but remove `"use server"` imports, use client hooks |

---

# 6. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Keeping auth pages | Auth Platform owns login/register/etc. |
| Keeping users page | Auth Platform owns user management |
| Keeping server actions | All mutations are client-side |
| Polling for workflow status | Bulk operations are synchronous |

---

# 7. Guiding Principle

> **Keep the UI shell, delete the server layer.** Pages and React components stay. Server actions, services, and repositories are deleted and replaced by client API modules.
