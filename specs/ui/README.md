# UI (shared components)

**Version:** 1.0
**Status:** Final
**Layer:** `ui` (shared presentational components)
**Audience:** Engineers, AI Development Agents

> Governs `src/components/` only. Feature-specific components stay in `src/features/{name}/components/`.

---

# 1. Purpose

It answers:

> **"What shared UI exists, and when do I reuse vs. build feature-local?"**

---

# 2. Scope

## Owns

- Primitives: `src/components/ui/*` (shadcn).
- App-level shared: layout, empty states, error states, not-found (`src/app/not-found.tsx`), toasts.
- BFF proxy note: `src/app/api/v1/[...path]/route.ts` is a path+query pass-through, not UI — see `../services/api-client.md`.

## Does Not Own

- Feature components (`features/*`), TipTap editors (feature-owned, in `features/templates/`).
- Anything deleted: `src/lib/pdf/`, `src/lib/email/`, `src/lib/qr/`, `src/lib/supabase/`, `src/lib/storage/`, `src/workflows/`, `src/proxy.ts`, all `features/*/server/`.

---

# 3. UI Contract

| Item | Location | Notes |
|------|----------|-------|
| primitives (button, dialog, input, toast) | `src/components/ui/` | dumb, no API calls |
| not-found / empty / error states | `src/components/` + `src/app/not-found.tsx` | per `not-found-state.md` |
| verify/view renderers | `src/components/` | re-sourced from client API (`GET /verify/{number}`, `/view/{id}`) |
| PDF buttons, QR display, CSV import | feature components | call `src/lib/api/` (PDF as Blob; CSV parsed client-side → JSON) |

---

# 4. API Calls

Shared UI makes **no API calls**. Data-bearing components live in `features/` and use `src/lib/api/`.

---

# 5. Rules

- `ui/` never imports `features/` or `src/lib/api/`. Direction is `features → ui`.
- No business logic in `ui/` — props + rendering only.
- Envelope-shaped responses (`{ data, meta }`) unwrapped in `features/`, not in `ui/`.

---

# 6. Tests

- [ ] Component tests (Vitest + RTL) co-located for shared states.
- [ ] `e2e/tests/public/verify.spec.ts`, `view.spec.ts` — public renderers against mock.

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Putting fetch logic in `src/components/` | Data lives in `features/` + `src/lib/api/` |
| Duplicating empty/error states per feature | Reuse shared states |
| Keeping `pdf/qr/email/supabase/storage` modules | Owned by Cert Platform / deleted |

---

# 8. Guiding Principle

> **Dumb and shared.** If it fetches data or knows a feature, it doesn't belong in `ui/`.
