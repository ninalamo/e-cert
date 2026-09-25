# Attendee Certificate Status (incl. Revoked)

**Version:** 1.0
**Status:** Final
**Layer:** `features`
**Audience:** Engineers, AI Development Agents

---

# 1. Purpose

It answers:

> **"How does the event attendees tab show whether an attendee's certificate is revoked — and what actions does that allow?"**

Staff must see revocation per row instead of a binary Issued/Not Issued, and must not be able to resend email for a revoked certificate.

---

# 2. Scope

## Owns

- Certificate Issue column in `AttendeesManager` (desktop table + mobile cards).
- Resend-email disabled state + tooltip + guard.

## Does Not Own

- Revocation itself, email content, bulk-issue/reissue (Cert Platform + `certificates.md`).
- The `certificate` relation payload (backend-owned; required shape documented in §4).

---

# 3. UI Contract

| Item | Location | Notes |
|------|----------|-------|
| Certificate Issue cell | `attendees-manager.tsx` desktop table | Three states: `No` (no `certificate_id`), `Yes` (issued, active), `Revoked` (danger pill) |
| Status badges | mobile card list | `Not Issued` / `Issued` / `Revoked`; existing `Uploaded` badge unchanged |
| Resend button | `resend-row-button` | Disabled when revoked; `title="Disabled because the certificate is revoked"` (native hover tooltip); active rows keep `title="Resend Certificate Email"` |
| View link | same row | Always enabled when `certificate_id` exists (detail page shows revoked banner) |

Derivation (frontend): `!certificate_id` → not issued; `certificate?.revoked_at` → revoked; else issued. Missing `certificate` field (old backend) → current binary behavior, no crash.

---

# 4. API Calls

| Action | Method + Path | Notes |
|--------|---------------|-------|
| Attendee list | `GET /events/{id}/attendees` | Requires per-row `certificate: { id, revoked_at, expires_at } \| null` (backend: `with('certificate:id,revoked_at,expires_at')`, same pattern as delete-preview) |
| Resend | existing resend call | Frontend guard blocks revoked before the call; backend remains source of truth |

No Supabase. No server actions. No `organization_id` (org from JWT `tenant.slug` server-side).

---

# 5. Rules

- Revoked rows never send email from this UI (disabled button + `handleResendEmail` early-return with toast error).
- Tooltip text is exact: `Disabled because the certificate is revoked`.
- Selection/checkbox behavior unchanged for revoked rows.
- Status filter dropdown unchanged (server-side).

---

# 6. Tests

- [ ] `tsc --noEmit`, `eslint`, `npm test` green.
- [ ] Planned e2e: revoked row badge visible (desktop + mobile); resend disabled with tooltip; resend on active row still works.

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Inferring revocation client-side without the field | Only the linked certificate row knows; guessing causes false badges |
| Hiding the resend button when revoked | Disabled-with-reason beats disappearance (discoverability) |
| Blocking view-link for revoked certs | Detail page already explains revocation; staff need to inspect it |

---

# 8. Guiding Principle

> **Show the certificate's true state per row; disable — never hide — actions that state forbids.**
