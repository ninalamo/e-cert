# Features

**Version:** 1.0
**Status:** Final
**Layer:** `features` (UI workflows)
**Audience:** Engineers, AI Development Agents

> One spec per `src/features/*` workflow. Each follows `../_template.md` (lightweight). Shared UI lives in `../ui/`. Routes in `../views/`.

---

# 1. Purpose

It answers:

> **"What does each feature workflow do, and which API calls back it?"**

---

# 2. Scope

## Owns

- Feature workflows in `src/features/`: events, certificates, templates, dashboard, audit, faq.
- Detailed behavior specs in this folder (see Spec Map).

## Does Not Own

- Routes (see `../views/`), shared primitives (see `../ui/`), API client internals (see `../services/api-client.md`).
- `users`, `organizations` feature modules — **removed** (dirs deleted; the `(dashboard)/users` view calls `usersAdminApi`/`user-activity` services directly, see `../views/`). `demo` excluded per D4 fresh-start.

---

# 3. UI Contract

| Feature | Location | Notes |
|---------|----------|-------|
| events (list, detail, attendees, import, issue) | `src/features/events/` | CSV parsed client-side → JSON import; delete flow per `attendee-deletion.md` |
| certificates (list, issue, bulk, PDF, revoke, email) | `src/features/certificates/` | PDF streamed as Blob; bulk is synchronous |
| templates (certificate + email TipTap) | `src/features/templates/` | persists via `PATCH /api/v1/templates` |
| dashboard (stats + activity) | `src/features/dashboard/` | read-only |
| audit (logs + export) | `src/features/audit/` | `admin` only |
| faq | `src/features/faq/` | static |

---

# 4. API Calls

Summary only — full typed modules in `../services/api-client.md`:

| Feature | Endpoints |
|---------|-----------|
| events | `GET/POST /events`, `GET/PATCH/DELETE /events/{id}`, `/events/{id}/stats`, `/events/{id}/attendees/import` (JSON) |
| certificates | `GET/POST /certificates`, `/certificates/{id}`, `/certificates/{id}/pdf`, `/certificates/{id}/qr`, revoke/delete (`admin`) |
| templates | `GET/POST /templates`, `PATCH/DELETE /templates/{id}` |
| dashboard | `GET /dashboard/*` |
| audit | `GET /admin/audit-logs` (`admin`) |

---

# 5. Rules

- Features call `src/lib/api/` only — never `fetch()` Cert host directly, never Supabase, never server actions.
- Cross-feature imports forbidden — share via `src/types/` or `../ui/`.
- Permission display from JWT `permissions` claim; enforcement stays server-side.

---

# 6. Tests

- [ ] `e2e/tests/events/event-crud.spec.ts`, `attendee-import.spec.ts`, `certificate-issue.spec.ts`
- [ ] `e2e/tests/certificates/certificate-list.spec.ts`, `certificate-pdf.spec.ts`, `certificate-revoke.spec.ts`
- [ ] `e2e/tests/templates/template-crud.spec.ts`, `tipTap-editor.spec.ts`

---

# 7. Spec Map

| Spec | Governs |
|------|---------|
| `events.md` | event list/detail/attendee workflows (consolidates attendee-deletion, event-visibility) |
| `certificates.md` | issue/bulk/PDF/QR/revoke |
| `templates.md` | TipTap editing (consolidates template-visibility) |
| `dashboard-audit.md` | stats + audit trail |
| `attendee-deletion.md` | delete-preview + with-cert flow (migrated detail spec, normative) |
| `event-visibility.md` | public/private event flag (migrated detail spec) |
| `template-visibility.md` | template owner visibility (migrated detail spec) |

---

# 8. Guiding Principle

> **One feature, one spec, one API module.** Co-locate UI logic in `src/features/{name}/`; share nothing directly between features.
