# API Client

**Version:** 2.0
**Status:** Final
**Layer:** `services` (data plumbing)
**Audience:** Engineers, AI Development Agents

> Migrated from `specs/api-client/README.md` + `specs/components/api-bff-layer.md`. Contract shapes: `../openapi/cert-api.yaml`.

---

# 1. Purpose

It answers:

> **"How does the SPA call the Cert API for every data operation — replacing Supabase and server actions?"**

---

# 2. Scope

## Owns

- Typed modules in `src/lib/api/` (one per resource), base `fetch` wrapper, BFF pass-through behavior.
- Envelope handling, error normalization, auth header injection, multipart + PDF Blob handling, pagination.

## Does Not Own

- Token lifecycle (see `auth.md`), PDF/QR/email generation, template rendering (Cert Platform).

---

# 3. UI Contract

```
src/lib/api/
├── client.ts       # BASE_URL=/api/v1, Bearer inject, 401→refresh→retry once, error throw, localhost [API] logging
├── events.ts       # CRUD + stats + client-side template clone (get + create)
├── attendees.ts    # CRUD + JSON import + lookup + file data + delete-preview + with-cert + issue/revoke/reissue
├── templates.ts    # CRUD (certificate + email + auth-template read paths)
├── certificates.ts # list/get/mine + issue + bulk + upload + PDF Blob + revoke/expire + delete + email + QR
├── dashboard.ts    # stats + activity
├── audit.ts        # logs query (filter, by-ids) + export
├── users-admin.ts  # /service/users* (list, status, groups) + /service/groups — backs the (dashboard)/users page
├── user-activity.ts# per-user summary derived client-side from /certificates?recipient_email= + /attendees/lookup
├── verify.ts       # public verify + view
└── types.ts        # envelope, pagination, error shapes
```

BFF (both Route Handlers, no rewrites — see `api-bff-layer.md`):

- `src/app/api/v1/[...path]/route.ts` — `/api/v1/*`; `auth/callback|refresh|logout` + everything else → `CERT_API_URL`; other `auth/*` → `AUTH_API_URL`. Forwards method, query, body, auth/content headers; cookies only for refresh/logout + auth-proxy paths; streams body (JSON, PDF Blob, empty); passes `set-cookie` through; backend down → `502`.
- `src/app/api/events/[...path]/route.ts` — legacy `/api/events/*` → `CERT_API_URL/api/v1/events/*`; used by the event-detail view's local `authFetch` for bulk ops (`bulk-issue`, `reissue`, `revoke-expired`). The typed client covers the same ops under `/api/v1` (`issue-completed`, `reissue-selected`, `revoke-expired`) — new code prefers the typed client.

---

# 4. API Calls

| Action | Method + Path | Notes |
|--------|---------------|-------|
| events | `GET /events`, `POST /events`, `GET/PATCH/DELETE /events/{id}`, `GET /events/{id}/stats` | `read` for GET, `write` for mutations |
| attendees | `GET/POST /events/{id}/attendees`, `GET /attendees/lookup?email=`, `DELETE /attendees/{id}`, `DELETE /attendees/{id}/with-cert` (`admin`), `GET /attendees/{id}/delete-preview`, `POST /events/{id}/attendees/import` (`{ attendees: [...] }` JSON — CSV parsed client-side), `POST .../issue-completed`, `.../reissue-selected`, `.../revoke-expired` | preview = `read` |
| certificates | `GET /certificates` (+`?organization_id=`, `with_event`), `GET /certificates/{id}`, `GET /me/certificates*` (participant), `POST /certificates`, `POST /certificates/bulk`, `POST /certificates/upload`, `GET /certificates/{id}/pdf` (Blob), `GET /certificates/{number}/qr`, `POST .../revoke`, `POST /certificates/expire`, `DELETE`, `POST .../email` + email-logs | revoke/delete = `admin`; PDF = binary stream, never base64 JSON |
| templates | `GET /templates` (+`?organization_id=`, `type=`, `with_lock`), `GET /templates/{id}`, `GET /templates/auth/{process}`, `POST /templates`, `PATCH/DELETE /templates/{id}` | |
| dashboard | `GET /dashboard/stats`, `GET /dashboard/activity` | read-only |
| audit | `GET /admin/audit-logs` (+filters, `by-ids`) | `admin` |
| users admin | `GET /service/users`, `PATCH /service/users/{id}/status`, `GET/POST/DELETE /service/users/{id}/groups*`, `GET /service/groups` | `admin` — backs `(dashboard)/users` (revoke/enable, never delete) |
| public | `GET /verify/{number}`, `GET /view/{id}` | no token |
| auth | `POST /auth/callback`, `POST /auth/refresh`, `POST /auth/logout` | see `auth.md` |

Base: same-origin `/api/v1` → BFF Route Handler → `CERT_API_URL` (default production host). Every non-public call carries `Authorization: Bearer <in-memory token>`. 401 → silent refresh → retry once → else throw (guard redirects to SSO). 403 = genuine lack of permission, show error, no retry. Pagination: `limit`/`offset`, `meta.has_more`.

---

# 5. Rules

- One typed module per resource; new code uses the typed client, never raw `fetch()` (legacy exception: event-detail `attendees-tab.tsx:authFetch` for bulk ops via `/api/events/*` — migrate to the typed client when touched).
- Binary PDFs as Blob; bulk ops synchronous (`{ success, failed, errors }`), no polling.
- Attendee delete routing: issued + admin → `/with-cert`; else plain `DELETE` (see `../features/attendee-deletion.md`).
- `organization_id`: still sent by `events.create`, `attendees.add`/`bulkAdd`, template clone, and list filters (hardcoded `ORG_ID` from `src/lib/org.ts`). Target is to stop sending it (org resolves from JWT `tenant.slug` server-side) — but the code sends it today, so keep it working until the Cert API confirms it is ignored.

---

# 6. Tests

- [ ] `src/__tests__/bff-proxy-route.test.ts` (Vitest) — v1 routing: cert vs. auth targets, header/cookie forwarding, 502, 400.
- [ ] `e2e/tests/auth/auth-flow.spec.ts` — SSO redirect, callback→dashboard, callback failure, logout.
- [ ] Planned: event/certificate/template CRUD suites against the mock (see `testing.md`).

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Direct Supabase/PostgREST | All data via Cert API |
| Server actions | Client-side calls only |
| Base64 PDF in JSON | Binary streams |
| Adding new `organization_id` sends | Legacy field; target is JWT-resolved org |

---

# 8. Guiding Principle

> **One typed module per resource, client-side only.**
