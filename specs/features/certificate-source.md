# Certificate Source (Uploaded vs System-generated)

**Version:** 1.0
**Status:** Final
**Layer:** `features`
**Audience:** Engineers, AI Development Agents

---

# 1. Purpose

It answers:

> **"How does the UI show whether a certificate is Uploaded or System-generated — and how does it persist that distinction?"**

Staff filter and badge certificates by source on the dashboard; participants see the source on their own certificates; verify/view surfaces stay accurate for both modes. The Cert API owns the truth (`generation_mode`); the UI never guesses.

---

# 2. Scope

## Owns

- Source filter pills + per-row badges on `src/app/(dashboard)/certificates` (`CertificatesList`).
- Source row in shared `src/features/certificates/components/certificate-detail.tsx`.
- Source badges + event titles on `src/app/(participant)/my/certificates*`.
- Source badges + valid-only Preview gate on `src/app/verify*` and revoked state on `src/app/view/[id]`.
- `generation_mode` metadata on all certificate/attendee writes (`issue-form`, roster add/edit, CSV import).
- `displaySource()` fallback rule (see §5).

## Does Not Own

- `generation_mode` resolution, `?source=` filtering, PDF/QR/email bytes (Cert Platform, by contract — see backend `certificate-source-spec.md`).
- Base certificate flows (see `certificates.md`).

---

# 3. UI Contract

| Item | Location | Notes |
|------|----------|-------|
| Source pills | `CertificatesList` filter bar | `Uploaded` / `System-generated`, toggle, `?source=` server filter + client safety-net re-filter; joint Clear with status |
| Row | `CertificatesList.renderRow` | Order: source pill → status pill → View → revoke/delete icon; sub-line `{number} · {email} · Issued {date}` |
| Source row | `certificate-detail.tsx` | `generation_mode` first, `file_path` fallback; labels `Uploaded` / `System-generated` |
| My list | `my/certificates/page.tsx` | Source badge + title `Event ("number")` (resolves `events?.name → event?.name → event_name`); sub-line deduped |
| My detail | `my/certificates/[id]/page.tsx` | Shared `CertificateDetail`; no local logic |
| Verify | `verify-search.tsx`, `verify/[certificateNumber]/page.tsx` | Source badge; Preview only when `valid && id` (both modes) |
| View revoked | `view/[id]/page.tsx` | 410 → warning + role-aware back link (`/certificates` admin/staff, `/my/certificates` participant, `/verify` logged-out); 404 unchanged |
| Issue form | `issue-form.tsx` | Sends `metadata: { generation_mode }`; file mode = issue (`send_email: false`) → upload real number → optional `sendEmail`; never sends `file_path` |
| Roster | `attendees-manager.tsx`, `upload-csv-form.tsx` | Add/edit/import always send `metadata.generation_mode` (explicit `template` default) |

---

# 4. API Calls

| Action | Method + Path | Notes |
|--------|---------------|-------|
| Filtered list | `GET /certificates?source=uploaded\|system-generated` | Server paginates; client re-applies predicate (no-op when supported) |
| Issue | `POST /certificates` | `metadata.generation_mode`, no `file_path` (prohibited); response `{ data: <cert> }` with `id` + `certificate_number` |
| Upload bytes | `POST /certificates/upload` | Requires EXISTING number; no `TEMP-…` pre-uploads |
| Resend | `POST /certificates/{id}/email` | Post-upload in file mode when requested |
| Roster writes | `POST /events/{id}/attendees`, `PATCH /attendees/{id}`, `POST /events/{id}/attendees/import` | `metadata` verbatim |
| Mine | `GET /me/certificates`, `GET /me/certificates/{id}` | Requires `generation_mode` per item (backend-owned) |
| Public | `GET /verify/{number}` (`valid`, `id`, `generation_mode`), `GET /view/{id}` (410 = revoked) | Preview entry identical for both modes |

No Supabase. No server actions. No `organization_id` (org from JWT `tenant.slug` server-side).

---

# 5. Rules

- Source rule everywhere: `generation_mode === "file"` → Uploaded, `"template"` → System-generated, absent → `file_path` heuristic, else System-generated.
- Backend-unknown safety: UI must render without errors when `generation_mode` is absent (old backend); accuracy improves when present. No version sniffing.
- `?source=` invalid values are a backend 422; UI only ever sends the two valid literals or omits the param.
- File-mode standalone issue never uploads before the cert exists.
- Preview never renders for revoked/expired certs on verify; `/view` revoked shows the warning state, never the document.
- Reissue always mints a NEW number (both reissue paths); UI copy must never promise number retention.

---

# 6. Tests

- [ ] `tsc --noEmit`, `eslint src/`, `npm test` green (current: 56/56).
- [ ] Planned e2e: source pills filter both modes; row badge == detail Source row; file-mode standalone issue end-to-end; verify Preview for both modes; revoked view warning per role.

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| `file_path`-only source checks | Template PDFs also get `file_path`; only `generation_mode` is authoritative |
| Sending `file_path` on issue | Backend prohibits it (422); source travels via `metadata.generation_mode` |
| Uploading before issue with temp numbers | `upload` requires an existing `certificate_number` |
| Assuming `{ data: { certificate } }` on issue | Backend returns `{ data: <cert> }`; read `id` + `certificate_number` directly |
| `PATCH /events/{id}/attendees/{attendeeId}` | No such route; attendee update is `PATCH /attendees/{id}` |

---

# 8. Guiding Principle

> **Show the mode the API returns; stamp the mode on every write; degrade to labels, never to errors.**
