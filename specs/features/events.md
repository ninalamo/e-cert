# Events

**Version:** 1.0
**Status:** Final
**Layer:** `features/events`
**Audience:** Engineers, AI Development Agents

---

# 1. Purpose

It answers:

> **"How do staff create events, manage attendees, import CSVs, and delete attendees with linked certificates?"**

---

# 2. Scope

## Owns

- `src/features/events/` — list, detail, attendees manager, CSV import, issue entry, visibility toggle.
- Detail: `attendee-deletion.md`, `event-visibility.md` (normative).

## Does Not Own

- Certificates issue internals (`certificates.md`), Cert API schema (`../services/api-client.md`).

---

# 3. UI Contract

| Item | Location | Notes |
|------|----------|-------|
| list / new / `[id]` / upload / issue | `src/app/(dashboard)/events*` | render feature components |
| attendees manager + delete dialog | `src/features/events/components/attendees-manager.tsx` | preview → confirm; states: loading / empty / error / preview-error |
| visibility toggle | event form | `is_public` on = all staff; off (default) = author + admin |

---

# 4. API Calls

| Action | Method + Path | Auth |
|--------|---------------|------|
| list/create | `GET/POST /events` | `read` / `write` |
| get/update/delete | `GET/PATCH/DELETE /events/{id}` | `read` / `write` |
| stats | `GET /events/{id}/stats` | `read` |
| import | `POST /events/{id}/attendees/import { attendees: [...] }` | `write` (CSV parsed client-side) |
| preview delete | `GET /attendees/{id}/delete-preview` | `read` |
| delete | `DELETE /attendees/{id}` / `DELETE /attendees/{id}/with-cert` | `write` / `admin` |
| bulk issue / reissue / revoke-expired | typed: `POST /events/{id}/attendees/issue-completed`, `/reissue-selected`, `/revoke-expired` (via `/api/v1`) — but the event-detail view's local `authFetch` still uses legacy `/api/events/{id}/bulk-issue`, `/reissue`, `/revoke-expired` | `write`; migrate view to typed client when touched |

---

# 5. Rules

- Issued row: admin-only trash; confirm deletes cert + attendee (`/with-cert`); non-issued: plain delete.
- Dialog lists exactly `Attendee record` + (`Issued certificate <number>` iff `deletes_certificate`); no user-account line (Auth users never touched).
- `is_public=false` default; author = `created_by` (immutable); admin sees all.

---

# 6. Tests

- [ ] `src/__tests__/attendees-manager-pagination.test.ts` (Vitest, exists) — paginator survives bad/empty `meta`.
- [ ] `src/__tests__/bff-proxy-route.test.ts` (Vitest, exists) — bulk/event routes proxy correctly.
- [ ] Delete dialog copy/route per `attendee-deletion.md` §9 (implemented — code matches); visibility matrix per `event-visibility.md`.
- [ ] Planned: e2e event/attendee suites (see `../services/testing.md`).

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| `DELETE /attendees/{id}?with_cert=true` | Ignored — use `/with-cert` route |
| Old preview shape (`has_certificate`) | Backend returns `linked_certificate` + `deletes_certificate` |

---

# 8. Guiding Principle

> **Check before deleting, delete together, never touch Auth users.**
