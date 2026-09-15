# LOA e-cert — Event Visibility (Public / Private Toggle)

## Product Assembly Component Specification

**Version:** 1.6
**Status:** Final
**Layer:** Product Assembly (`e-cert` + `loa-cert-platform`) — Events Module
**Audience:** Engineers, AI Development Agents

> **Related:** `specs/components/template-visibility.md` (sibling pattern, not the same rule),
> `specs/auth/role-resolution.md`, `specs/data-flow.md`.
> Backend enforcement is implemented in `loa-cert-platform`
> (`Event::isVisibleTo/scopeVisibleTo`, `EventController`, `events.is_public`).

---

# 1. Purpose

It answers:

> **"Who is allowed to see and edit an event, given a public/private flag set at creation?"**

Today event access is level-gated only: any caller with `read` sees every event. This spec adds an explicit `is_public` flag so authors keep private events exclusive, while shared events remain visible (and editable) to all staff. Certificates are unaffected — visibility applies to events only.

---

# 2. Requirement (source of truth)

| Flag | Who can view it | Who can edit it |
|------|-----------------|-----------------|
| `is_public = true` | Everyone except `cert-user` (all staff + admin) | All staff + admin (`cert-user` holds no write grants) |
| `is_public = false` (default) | **Only its author** (`created_by` = caller sub) **plus `cert-admin`** | Author + admin, via the standard `write` level |
| `cert-user` | **No dashboard event access at all** (participant pages only) | Nothing |

Rules:

- The flag is a simple on/off toggle: *on* = listed for all staff; *off* = author-only (+ admin override).
- **Owner = creator, never the last editor.** Authorship is `created_by`, server-stamped at create, immutable afterwards. (Deliberate difference from templates, whose owner set includes `updated_by`.)
- Default is `false` (private). Sharing is opt-in.
- `cert-admin` sees and edits every event regardless of flag or authorship.
- **`created_by` is REQUIRED on every event row.** Authorship is stamped from
  the caller JWT sub on create; a write with no resolvable author is rejected
  (401) — never stored null. (JWT validation itself does not enforce `sub`,
  so the event write path asserts it explicitly.)
- **`updated_by` is REQUIRED wherever the column exists** (events + templates).
  Initial value is always identical to `created_by`; every successful update
  re-stamps it with the caller sub (401 when unresolvable — never left stale,
  never null). Client-sent values for either field are ignored.
  On events this is last-editor tracking only: ownership stays `created_by`.
- **Author guard rail:** `created_by` / `updated_by` must resolve to an **active**
  user with cert-api access at write time. On event create/update the server
  looks the caller sub up against Auth (`GET /api/v1/users/{sub}` with the
  caller JWT) and proceeds only on HTTP 200 with `status === 'active'`.
  Rationale: JWTs are validated locally, so a revoked/disabled user (or one
  removed from the tenant) can otherwise keep writing until token expiry.
  Resolved non-active/unknown → 403; Auth unreachable → 502, nothing written
  (fail-closed both ways). Platform-admin subs are not tenant members, so they
  cannot author events — tenant content is authored through tenant groups.
- **Note (deferred, not enforced):** temporary lockout (`locked_until` set while
  `status` reads `active`) is currently treated as active. Enforcing it needs
  Auth `GET /api/v1/users/{id}` to expose `locked_until`, which it does not
  today — revisit when that field is available. See §8.5.

---

# 3. Scope

## Owns

- The `is_public` column semantics on `events` (boolean, default `false`).
- `created_by` stamping: server-set from the caller JWT sub on create; rejected/ignored on update.
- List/show/update/destroy visibility rules for `GET /api/v1/events`, `GET /api/v1/events/{id}` (non-visible → 404, same shape as missing).
- Owner-or-admin guard on visibility flips (`PATCH is_public` by non-author non-admin → 403).
- Frontend: public/private toggle on event create (default off) and event edit (disabled unless author or admin), plus a Private badge wherever events are listed or grouped.

## Does Not Own

- Certificates (`GET /api/v1/certificates` is unscoped by design — visibility applies to events only).
- Authentication / tenant checks (`jwt.auth`, `jwt.endpoint` — unchanged).
- `cert-user` grant set (no write, read-only participant paths — unchanged).
- `/api/v1/me/events` (stays strictly author-scoped, unaffected by the flag).
- Sub-action endpoints (`bulk-issue`, `attendees/*`, `stats`, clone-template) — not visibility-checked in v1 (see §8).

---

# 4. Data Model

Migration `2026_09_15_000001_add_is_public_to_events_table`:

```text
events.is_public  boolean  NOT NULL  DEFAULT false  (after `status`)
```

- Existing rows backfill to `false` (private).
- `created_by` is `NOT NULL` (follow-up constraint migration using raw
  `ALTER TABLE ... MODIFY`, no dbal in the project). Deploy runbook: legacy
  rows with `created_by = NULL` must first be resolved by operator SQL
  (assign the true author sub, or delete the row) — the migration fails loudly
  otherwise, by design. No sentinel values: an unknown author must stay
  resolvable, never invented.
- `events.updated_by` (new nullable column via migration, then constrained):
  stamped `= created_by` at create, re-stamped on every update, `NOT NULL`
  after backfill. Legacy backfill is deterministic: `updated_by = created_by`
  (valid because initial value is defined identical). Ownership is unaffected —
  visibility still checks `created_by` only.
- `events.created_at` / `events.updated_at` are REQUIRED (same rule, datetime
  form). Eloquent stamps both on every write automatically (not client-settable),
  so new rows can never be null; the constraint migration makes this structural
  (`NOT NULL` via raw `ALTER TABLE ... MODIFY`). Legacy nulls backfill with the
  migration timestamp — documented as approximate, flagged in the runbook; it
  affects only pre-constraint rows.
- `certificate_templates.updated_by` becomes `NOT NULL` (same migration);
  legacy nulls backfill from `created_by`. Rows where `created_by` is also
  null fall under the operator runbook above.
- `Event` model: `is_public`, `updated_by` in `$fillable`;
  `'is_public' => 'boolean'` cast.
- Fresh-install SQL carries both columns `NOT NULL` where constrained + migrations row.
- Factories set `created_by` = `updated_by` (mirrors the existing
  `CertificateTemplateFactory::ownedBy()` pattern).

---

# 5. API Contract (implemented)

## 5.1 Write paths

`POST /api/v1/events` accepts `is_public?: boolean` (default `false` when omitted).
`created_by` in the request body is ignored — the server stamps the caller sub,
and rejects with 401 when no sub is resolvable (never persists null). Before
persisting, the author guard rail (§2) verifies the sub is an active tenant
user; no extra round-trip is cached — writes are infrequent, freshness wins.

`PATCH /api/v1/events/{id}` accepts `is_public?: boolean` with two guards:

1. Target must be visible to the caller, else 404 (same as missing).
2. Changing the flag requires author (`created_by` = sub) or `cert-admin`, else 403
   (`Only the event author or a Vericert Admin may change visibility`).
   Non-flag fields follow the existing `write`-level rule.

`created_by` is stripped from update payloads (immutable authorship).

## 5.2 Read paths

- `GET /api/v1/events` — scoped: `is_public OR created_by = sub`; `cert-admin` unscoped.
- `GET /api/v1/events/{id}` — same rule, non-visible → 404.
- `DELETE /api/v1/events/{id}` — same visibility pre-check, then existing behavior.
- List/show responses include `is_public: boolean` and `created_by: string | null`.

---

# 6. Frontend Contract (to implement)

## 6.1 Create (`(dashboard)/events/new`)

- Public/private toggle (iOS-style switch or checkbox), **default OFF** with helper
  text: "Off = only you (and Vericert Admins) can see this event."
- Submitted as `is_public` in the create payload. Client must not send `created_by`.

## 6.2 Edit (event detail surface)

- Same toggle, initialized from the loaded event.
- **Disabled unless the viewer is the author or a `cert-admin`**, with hint text
  ("Only the author or a Vericert Admin can change visibility") — the API 403s
  flips otherwise, but the UI must not offer them.
- Non-visible events never reach the edit surface (API 404 → not-found state).

## 6.3 Badges

- Events list rows and certificate group headers show a muted `Private` pill when
  `is_public === false`. No pill for public events.

---

# 7. Acceptance Criteria

1. Creating an event without `is_public` stores `false`; response echoes `is_public` + stamped `created_by` = caller sub.
2. Sending `created_by` in create/update bodies has no effect.
3. A create with an unresolvable author sub is rejected (401); no null-author row can be written.
4. After the constraint migration, `SELECT COUNT(*) FROM events WHERE created_by IS NULL` returns 0.
5. After the constraint migration, no `events` row has null `updated_by`, `created_at`, or `updated_at`; same for `certificate_templates.updated_by`.
6. Event create/update with a disabled caller (or a sub removed from the tenant): 403, nothing written. Auth outage mid-write: 502, nothing written.
7. Staff B sees staff A's private event: list omits it, show returns 404.
8. Staff B PATCHes staff A's private event (any field): 404.
9. Staff B PATCHes `is_public` on A's public event: 403; on own event: 200.
10. `cert-admin` sees/edits/flips everything.
11. `cert-user` JWTs gain no new grants; dashboard event routes stay denied.
12. Certificates list/detail behavior unchanged (no per-event scoping).

---

# 8. Known Gaps / Follow-ups

| # | Item | Status |
|---|------|--------|
| 1 | Pre-existing events with `created_by = NULL`: operator SQL assigns the true author (or deletes the row) before the NOT NULL migration runs. | Deploy step, blocks constraint migration |
| 2 | Sub-action endpoints (`bulk-issue`, `issue-completed`, `reissue`, `revoke-expired`, `attendees/*`, `stats`, clone-template) do not check event visibility. A staff caller guessing a private event id can act on it (still needs `write` level). | Deferred v2 |
| 3 | Author transfer (reassigning `created_by`) is impossible by design. Admin workaround: flip public or recreate. | By design |
| 4 | Template parity: `certificate_templates` carries the same authorship fields but has no write-time active-user guard. Proposed for the template-visibility spec, out of scope here. | Follow-up |
| 5 | Lockout awareness: `locked_until`-set callers currently pass the guard while `status` reads `active`. Needs Auth `GET /users/{id}` to expose `locked_until` first. | Noted, deferred |

---

# 9. Doc Control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-09-15 | Initial draft: flag semantics, owner=creator rule, API + frontend contracts, gaps. |
| 1.0 | 2026-09-15 | Promoted to **Final** — approved for implementation. |
| 1.1 | 2026-09-15 | `created_by` required always: write-path 401 on unresolvable author, NOT NULL constraint migration (raw ALTER, no dbal), legacy-null operator backfill runbook. Status: **Final**. |
| 1.2 | 2026-09-15 | `updated_by` required wherever present: initial value identical to `created_by`, re-stamped on every update; new `events.updated_by` column; NOT NULL + backfill-from-`created_by` both tables. Status: **Final**. |
| 1.3 | 2026-09-15 | `events.created_at` / `updated_at` required: Eloquent-stamped, NOT NULL constraint, legacy nulls backfilled with migration timestamp (approximate, runbook-flagged). Status: **Final**. |
| 1.4 | 2026-09-15 | Author guard rail: `created_by`/`updated_by` must resolve to an active tenant user at write time (Auth lookup, fail-closed 403/502); platform-admin authorship unsupported. Status: **Final**. |
| 1.5 | 2026-09-15 | Active refined to `status === 'active'` and `locked_until === null`; Auth show must expose `locked_until`. Status: **Final**. |
| 1.6 | 2026-09-15 | Lockout check deferred: guard enforces `status` only; `locked_until` noted in §2/§8.5 until Auth exposes the field. Status: **Final**. |
