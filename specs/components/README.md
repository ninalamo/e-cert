# LOA e-cert — Components
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — UI Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §9.3

---

# 1. Purpose

It answers:

> **"Which components/modules stay, which are removed, and which are adapted after the CSR refactor?"**

---

# 2. Components That Stay

- TipTap editors (certificate + email templates)
- Base UI components (`src/components/ui/*`)
- Verify/view renderers (re-sourced from client API)
- Dashboard, event, certificate components

---

# 3. Components That Are Adapted

| Component | Change |
|-----------|--------|
| All React components using server actions | Replace `import { someAction } from "..."` with client API calls |
| PDF preview/download buttons | Point to Cert PDF endpoints via client API |
| QR display | Use `/api/v1/certificates/qr` via client API |
| CSV upload flow | Multipart upload via client API |
| Event/certificate detail | Envelope-shaped responses from client API |

---

# 4. Modules That Are Removed

| Module | Reason |
|--------|--------|
| `src/lib/pdf/` | Cert Platform owns PDF generation |
| `src/lib/email/` | Cert Platform owns email sending |
| `src/lib/qr/` | Cert Platform owns QR generation |
| `src/lib/supabase/` | No direct DB access |
| `src/lib/storage/` | Cert Platform owns storage |
| `src/lib/seed/` | Legacy seed data; fresh start (D2) |
| `src/lib/repository/*` | Replaced by API client |
| `src/lib/auth/password.ts` | No password handling |
| `src/lib/auth/tokens.ts` | No token management in DB |
| `src/lib/auth/config.ts` | Minimal or deleted |
| `src/features/auth/` (UI) | Auth Platform owns auth UI |
| `src/features/users/` | Auth Platform owns user management |
| `src/features/organizations/` | Single org resolved from JWT tenant |
| `src/features/demo/` | Demo mode excluded |
| `src/workflows/` | Async workflow removed; bulk ops are synchronous |
| `src/proxy.ts` | No server-side auth injection |
| All `features/*/server/` dirs | Server actions deleted; replaced by `src/lib/api/*` |

---

# 5. Modules That Are Added

| Module | Purpose |
|--------|---------|
| `src/lib/api/*` | Typed Cert API client modules (primary data layer) |
| `src/lib/auth/sso-fragment.ts` | SSO fragment handler |
| `src/lib/auth/token-store.ts` | In-memory access token management |
| `src/lib/auth/session-handling.ts` | Token lifecycle (get, set, clear, refresh) |
| `src/lib/auth/auth-guard.tsx` | Client-side route protection |

---

# 6. File Count Impact

| Category | Legacy | Refactored | Delta |
|----------|--------|------------|-------|
| Server actions | ~75 files | 0 | -75 |
| API client modules | 0 | ~8 | +8 |
| Auth modules | 5 | 4 | -1 |
| React components | ~50 | ~45 | -5 (auth UI removed) |

---

# 7. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Keeping `src/lib/pdf/` | Cert Platform owns PDF generation |
| Keeping `src/lib/supabase/` | No direct DB access |
| Keeping `src/features/auth/` UI forms | Auth Platform owns auth UI |
| Keeping server actions | All mutations are client-side |
| Keeping `src/workflows/` | Async workflow removed |

---

# 8. Guiding Principle

> **Delete the server layer, keep the UI shell.** React components and TipTap editors stay. Server actions, services, repositories, and infrastructure modules are deleted and replaced by client API modules.
