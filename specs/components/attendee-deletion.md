# LOA e-cert — Event Attendee Deletion with Linked Certificate
## Product Assembly Component Specification

**Version:** 1.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) + Cert Platform API (`loa-cert-platform`)
**Audience:** Engineers, AI Development Agents

> **Related:** `specs/components/api-bff-layer.md` (BFF proxy, no change needed),
> `specs/auth/user-revocation.md` (revoke-without-delete precedent),
> governing spec `loa-apache-server-apps/assemblies/loa-cert-platform/legacy-e-cert-integration.md`.
> **Rule 0 gate:** no implementation code until this spec is Final.

---

# 1. Purpose

It answers:

> **"When deleting an event attendee, how do we (1) preview what will be deleted, (2) also delete the linked certificate, and (3) guarantee the Auth Platform user is never removed?"**

Scope is the delete flow on `events/[id]?tab=attendees`:

1. **Check before deleting** — show what will be deleted (attendee record + issued certificate, if any).
2. **Delete attendee + certificate together** — no orphaned `certificates` rows.
3. **Auth user preservation (check-only, no code change)** — verify that deleting attendee/cert never deletes the `loa-auth-platform` user.

---

# 2. Current behavior (verified 2026-09-14)

## 2.1 Frontend chain

| Step | File | Lines |
|------|------|-------|
| Page → detail → tab | `src/app/(dashboard)/events/[id]/page.tsx` | `22-26` |
| Tab → manager | `src/app/(dashboard)/events/[id]/components/attendees-tab.tsx` | `542-551` |
| Trash click → preview fetch → dialog → confirm → `handleRemove` | `src/features/events/components/attendees-manager.tsx` | `605-612`, `915-954`, `310-336` |
| API module | `src/lib/api/attendees.ts` | `78-93` |
| Transport | `src/lib/api/client.ts:187` → `src/app/api/v1/[...path]/route.ts:59` (BFF, forwards path+qs as-is) | — |

`handleRemove` gating (current, to preserve):

```ts
// attendees-manager.tsx:314
isAdmin && target?.certificate_id
  ? attendeesApi.removeWithCert(id)   // issued + admin
  : attendeesApi.remove(id);          // non-issued
```

Row trash visibility (current, to preserve):

```tsx
// attendees-manager.tsx:602
{(isAdmin || !a.certificate_id) && ( <trash/> )}
```

So non-admin can never delete an issued row via UI. `isAdmin` = JWT has `admin:` prefix (`events/[id]/page.tsx:16-20`).

## 2.2 Backend (normative — already tested, do not reshape)

`loa-cert-platform/routes/api.php:100-108`:

| Method + path | Controller | Effect |
|---|---|---|
| `DELETE /api/v1/attendees/{id}` | `AttendeeController::destroy:398-410` | Deletes attendee row only |
| `DELETE /api/v1/attendees/{id}/with-cert` | `destroyWithCert:358-380` | Deletes `certificates` row then attendee row + audit logs |
| `GET /api/v1/attendees/{id}/delete-preview` | `deletePreview:547-566` | Returns `{ attendee_id, name, email, linked_certificate:{id,number,status}\|null, deletes_certificate:bool }` |

Permission catalog (`config/cert-endpoints.php:32-34`): plain delete = `write`, `with-cert` = `admin`, `delete-preview` = `read`.

Covered by `tests/Feature/Api/AttendeeTest.php:206-288` (`test_delete_attendee`, `test_delete_attendee_with_cert`, both preview tests).

## 2.3 Defects (why this spec exists)

| # | Defect | Evidence |
|---|--------|----------|
| D1 | **Wrong delete route.** `removeWithCert` calls `DELETE /attendees/{id}?with_cert=true` (`attendees.ts:84-85`). Backend `destroy()` ignores the query → attendee deleted, certificate orphaned (still active, still counted in stats). Correct route is `DELETE /attendees/{id}/with-cert`. | Frontend vs `routes/api.php:105` + `AttendeeTest.php:241` |
| D2 | **Preview shape mismatch.** Backend returns `linked_certificate` object + `deletes_certificate` bool. Frontend type (`attendees.ts:5-9`) and state (`attendees-manager.tsx:86-89`) expect `has_certificate:boolean` + `certificate_number:string\|null`, and dialog checks `deletePreview.has_certificate` (`:930,948`). Always falsy → dialog shows only "Attendee record", confirm button never switches to "Delete Certificate & Remove". | `AttendeeController:553-564` vs `attendees-manager.tsx:925-951` |
| D3 | **Unbacked "User account" line.** Dialog lists `User account (no other event records found)` whenever `has_certificate` is true (`:931-933`). Backend never checks users or other events. Combined with §5 finding, this line is false and must go. | No such field in `deletePreview`; §5 verification |
| D4 (hardening, optional) | `destroy()` allows orphan creation via direct API call when `certificate_id` is set. `destroyWithCert` does two deletes without `DB::transaction`. | `AttendeeController:398-410`, `:358-380` |

---

# 3. Scope

## Owns

- e-cert delete-preview fetch, dialog copy, and delete routing (2 small frontend edits).
- Optional Cert Platform hardening: `destroy()` guard + transaction in `destroyWithCert`.

## Does Not Own

- `loa-auth-platform/app/**` — **explicitly out of scope, no code change** (verification in §5).
- BFF proxy (`app/api/v1/[...path]/route.ts`, `app/api/events/[...path]/route.ts`) — forwards path+qs unchanged; no change.
- Permission catalog levels, audit event names, certificate issuance/reissue flows.

---

# 4. Desired behavior

## 4.1 Check before deleting (preview)

1. Trash click sets `removeTarget`, `previewLoading=true`, clears `deletePreview` and `previewError`.
2. `GET /attendees/{id}/delete-preview` via BFF → backend.
3. While loading: dialog body shows `Checking what will be deleted...`, confirm disabled.
4. On success, dialog shows a danger box:
   - Always: `Attendee record`
   - Only if `deletes_certificate === true`: `Issued certificate <number>` (number from `linked_certificate.number` when present)
   - Never: any user-account line (D3 removed).
5. Confirm button label: `deletes_certificate ? "Delete Certificate & Remove" : "Remove"`.
6. On preview fetch failure (404/5xx/network): set a new `previewError` string state
   (alongside `previewLoading`/`deletePreview`), render it inline in the dialog above
   the danger box, fall back to attendee-only wording, and still allow confirm
   (backend remains source of truth at delete time). Do not reuse the page-level
   `error` banner for preview failures and do not block on stale `has_certificate` logic.
7. Non-admin preview of an issued row is unreachable via UI (row hidden) but if opened programmatically the same preview renders; delete itself will 403 on `with-cert` (admin-only) — acceptable, no extra handling.

## 4.2 Delete attendee + certificate

1. Confirm calls `handleRemove(id)` with existing gating unchanged (preview is
   display-only and never drives routing):
   - `isAdmin && target.certificate_id` → `DELETE /attendees/{id}/with-cert` → backend deletes cert then attendee, returns `204`.
   - Else → `DELETE /attendees/{id}` → backend deletes attendee, returns `204`.
   `target` is the row found via `attendees.find((a) => a.id === id)`; it may be
   stale after pagination/filter changes, which is acceptable because the backend
   re-validates at delete time.
2. On `204`/`undefined`: remove id from selection set, re-fetch current page, close dialog, clear preview (and `previewError`).
3. Null-result (already-gone) handling: `remove`/`removeWithCert` resolve `null`
   only on the `No query results` passthrough (`attendees.ts:79-87`). Treat `null`
   as idempotent success: close dialog, clear preview/`previewError`, drop the id
   from selection, re-fetch the page, and show info `Attendee was already removed`
   — no error banner. This changes current `handleRemove:320-322`, which today maps
   `null` to `Failed to remove attendee`. Only thrown errors show that banner.
4. Audit trail unchanged: `certificate.deleted {channel: attendee_delete}` + `attendee.deleted {with_certificate: true}` for with-cert path; `attendee.deleted` for plain path.
5. Optional backend hardening (recommended, backwards-compatible):
   - `destroy()`: if `certificate_id` is set, return `422 {status:error, message:"Attendee has an issued certificate. Use DELETE /attendees/{id}/with-cert."}` instead of orphaning.
   - `destroyWithCert()`: wrap cert-delete + attendee-delete in `DB::transaction()`.

## 4.3 Auth user preservation (check-only)

No implementation. Verification already done (§5). Spec records the guarantee: deleting an event attendee and/or its certificate never creates any request to Auth Platform and never deletes a user/member.

---

# 5. Auth-platform verification (no code change required)

| Check | Result |
|-------|--------|
| `EventAttendee` relations (`loa-cert-platform/app/Models/EventAttendee.php:53-61`) | Only `belongsTo(Event)`, `belongsTo(Certificate)`. No `User` relation, no cascade, no observer. |
| `Certificate` relations (`app/Models/Certificate.php:54-72`) | Only `belongsTo(Organization|Event|Template)`, `hasMany(emails)`. No user FK. |
| `AttendeeController::destroy` / `destroyWithCert` | Only `Certificate::where(...)->delete()` + `$attendee->delete()` + `AuditLogger::record`. Zero `Http::` calls, zero imports of auth models. |
| `CertUserChecker` (`app/Services/CertUserChecker.php:28-63`) | Read-only `GET {auth}/api/v1/tenant/members?email=`. Fail-closed to `true`. No delete method. Used only for email `isRegistered`/activate-URL display in issue flows. |
| `AuthProxyController::destroyMember` (`app/Http/Controllers/AuthProxyController.php:59-62`) | Only caller path is `DELETE /api/v1/service/members/{userId}` (admin). Grep confirms never referenced from `AttendeeController` or any delete-preview/destroy path. |
| Auth-platform user deletion | Only `WebAdminController::deleteUser:234-259` and `TenantMemberApiController::destroy:124` (explicit admin/member flows). Nothing subscribes to cert-platform attendee events. |

**Conclusion:** attendee/cert deletion is confined to the cert database. Auth users/members survive. The dialog must not promise or threaten user deletion.

---

# 6. Contracts

## 6.1 Backend contract (normative, do not reshape)

```json
GET /api/v1/attendees/{id}/delete-preview → 200
// no certificate
{ "data": {
    "attendee_id": "uuid",
    "name": "string",
    "email": "string",
    "linked_certificate": null,
    "deletes_certificate": false
} }
// with certificate
{ "data": {
    "attendee_id": "uuid",
    "name": "string",
    "email": "string",
    "linked_certificate": { "id": "uuid", "number": "string", "status": "active|revoked|expired" },
    "deletes_certificate": true
} }
```

```text
DELETE /api/v1/attendees/{id}          → 204 (attendee only; 404 if missing)
DELETE /api/v1/attendees/{id}/with-cert → 204 (cert + attendee; 404 if missing)
```

## 6.2 Frontend mapping (the fix)

```ts
// src/lib/api/attendees.ts — replace AttendeeDeletePreview
export interface AttendeeLinkedCertificate {
  id: string;
  number: string;
  status: string;
}
export interface AttendeeDeletePreview {
  attendee_id: string;
  name: string;
  email: string;
  linked_certificate: AttendeeLinkedCertificate | null;
  deletes_certificate: boolean;
}
```

```ts
// removeWithCert — the one-line route fix
removeWithCert: (attendeeId: string) =>
  api.delete(`/attendees/${attendeeId}/with-cert`).catch(...)
```

Component state becomes `useState<AttendeeDeletePreview | null>` (import the type; delete the local `{has_certificate,...}` shape) and all `deletePreview.has_certificate` reads become `deletePreview.deletes_certificate`; certificate number renders from `deletePreview.linked_certificate?.number`. Add a `previewError` string state for §4.1.6 and change the `handleRemove:320-322` null branch to the idempotent-success path in §4.2.3. The row trash `title` (`attendees-manager.tsx:613`, "This will also delete the issued certificate") is already correct and stays.

## 6.3 Permissions (unchanged)

| Action | Required level | UI gate |
|--------|---------------|---------|
| Preview | `read` | trash visible per row rule |
| Plain delete | `write` | `!a.certificate_id` (any writer) |
| With-cert delete | `admin` | `isAdmin && a.certificate_id` |

> Note: the `isAdmin` prop threaded through `events/[id]/page.tsx:19`
> (`canUserDelete`) → `event-detail.tsx:331` → `attendees-tab` → manager is really
> "can delete" (JWT has `admin:` prefix). No rename in this spec to minimize churn.

---

# 7. Files

## To modify (required)

| File | Change |
|------|--------|
| `e-cert/src/lib/api/attendees.ts` | Replace `AttendeeDeletePreview` interface with backend shape (§6.2); point `removeWithCert` at `` `/attendees/${id}/with-cert` `` |
| `e-cert/src/features/events/components/attendees-manager.tsx` | Import `AttendeeDeletePreview` type; retype `deletePreview` state; add `previewError` string state for preview failures; map `deletes_certificate`/`linked_certificate.number` in dialog box + confirm label; delete the `User account (no other event records found)` `<li>`; change `handleRemove:320-322` null branch to idempotent success (§4.2.3) |

## To modify (optional hardening, cert-platform)

| File | Change |
|------|--------|
| `assemblies/loa-cert-platform/app/Http/Controllers/AttendeeController.php` | `destroy()`: 422 when `certificate_id` set; `destroyWithCert()`: wrap in `DB::transaction()`; optionally delete the certificate's `Storage` file (precedent: `CertificateController::destroy:911`) and update the stale `AttendeeDeletePreviewResponse` OA schema (`:77-83`, declares `linked_certificate` as string instead of object) |

## Explicitly NOT to modify

- `loa-apache-server-apps/assemblies/loa-auth-platform/app/**` (any file)
- `e-cert/src/app/api/**` (BFF), `config/cert-endpoints.php`, permission/role resolution, issuance flows

## Explicitly out of scope (known adjacent orphans, unchanged)

- Bulk `import(replace)` (`AttendeeController:462`) deletes attendee rows without touching certificates.
- Attendee `metadata.file_path` uploads and certificate `file_path` PDFs on the with-cert path (storage-file cleanup is optional hardening only).
- `EventController::destroy` relies on FK cascades (`certificates.event_id` + `event_attendees.event_id` cascade; `certificate_emails.certificate_id` cascade) — no change here.

---

# 8. Error handling

| Scenario | Behavior |
|----------|----------|
| Preview fetch fails (404/5xx/network) | Set `previewError`, render it inline in the dialog above the danger box, fall back to attendee-only wording, keep confirm enabled (backend re-validates at delete time). Confirm stays disabled only while `previewLoading` is true |
| Delete resolves `null` (`No query results` passthrough) | Idempotent success per §4.2.3: close dialog, clear preview/`previewError`, drop id from selection, re-fetch page, show info `Attendee was already removed` — no error banner |
| Delete throws (incl. 403 non-admin on with-cert) | Close dialog, clear preview/`previewError`, show `Failed to remove attendee` banner; selection unchanged |
| Delete 422 (new orphan-guard, if adopted) | Show server message in banner; do not clear selection |
| Network failure mid-delete | Banner + keep selection; user retries; issuance `with-cert` path is idempotent-safe via 404 passthrough |

---

# 9. Acceptance criteria

1. Admin deleting an issued attendee calls `DELETE /attendees/{id}/with-cert`; afterwards both `event_attendees` and `certificates` rows are gone (no orphan).
2. Deleting a non-issued attendee calls `DELETE /attendees/{id}`; no certificate call is made.
3. Delete dialog for an issued attendee lists exactly `Attendee record` + `Issued certificate <number>` and the confirm button reads `Delete Certificate & Remove`; for a non-issued attendee it lists only `Attendee record` with `Remove`.
4. No dialog copy mentions user-account deletion.
5. Preview loading state disables confirm and shows checking text.
6. Non-admin still cannot see/use trash on issued rows; direct `with-cert` call without `admin` still 403s (backend-owned).
7. Auth-platform preservation (check-only, no new code): deleting an attendee+certificate deletes zero `users`/`tenant/members` rows — member count and rows unchanged before/after (cert-DB `audit_logs` rows are expected to grow, so "byte-identical DB" is explicitly not required).
8. Existing `AttendeeTest.php` suite stays green; if the optional 422 guard is adopted, add a test asserting plain `DELETE` on an issued attendee returns `422` and preserves both rows.

---

# 10. Testing checklist

- [ ] `AttendeeTest.php`: `test_delete_attendee`, `test_delete_attendee_with_cert`, both `test_delete_preview_*` pass; plus new 422 test if guard adopted.
- [ ] Manual: admin deletes issued attendee → network tab shows `/with-cert` → `204`; cert verify page for old number 404s; event stats decrement.
- [ ] Manual: admin deletes non-issued attendee → network tab shows plain `DELETE` → `204`.
- [ ] Manual: dialog copy checked for both cases; no user-account line; button labels correct.
- [ ] Manual: preview failure (e.g. offline/stale id) shows inline `previewError`, falls back to attendee-only wording, confirm stays enabled.
- [ ] Manual: deleting an already-gone attendee shows `Attendee was already removed` info, no error banner, list refreshes.
- [ ] Manual: non-admin sees no trash on issued rows; `readOnly` (archived event) shows no actions column.
- [ ] e-cert typecheck/lint pass (no other callers of the old `AttendeeDeletePreview` shape remain).

---

# 11. Doc control

| Version | Date | Change |
|---------|------|--------|
| 0.1 | 2026-09-14 | Initial draft: traced call chain, recorded D1–D4 defects, specified preview/delete mapping, recorded auth-user check-only verification. |
| 0.2 | 2026-09-14 | Review fixes: corrected §6.1 preview example (null vs object), specified `previewError` state, clarified preview-is-display-only + `isAdmin` naming, fixed null/already-gone path to idempotent success, fixed §9.7 to row-preservation (not byte-identical), scoped out import-replace/storage-file/event-cascade orphans, noted OA schema + storage-file hardening. |
| 1.0 | 2026-09-14 | Promoted to Final: spec complete, verification done, no open items blocking implementation. |
