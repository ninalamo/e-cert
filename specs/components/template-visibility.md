# LOA e-cert — Certificate Template Visibility (Public / Private)
## Product Assembly Component Specification

**Version:** 1.1
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Templates Module (API contract enforced by Cert API)
**Audience:** Engineers, AI Development Agents

> **Related:** `specs/auth/role-resolution.md` (role derivation), `specs/data-flow.md`.
> Backend enforcement is implemented in `loa-cert-platform` (`CertificateTemplateController`, `certificate_templates` table).

---

# 1. Purpose

It answers:

> **"Who is allowed to see a certificate template, given a public/private flag set by its author?"**

Today every authenticated user sees every template. This spec introduces an explicit visibility flag so authors keep drafts and internal templates exclusive, while shared ones remain organization-wide.

---

# 2. Requirement (source of truth)

| Visibility | Who can see it |
|------------|----------------|
| `public`   | Everyone — `cert-admin` and `cert-staff` alike, **no author/owner filter** |
| `private`  | **Only its owners** — the template's owner set (see §6); typically the authoring `cert-staff`, plus the last editor if someone else touched it |
| (always)   | **`cert-admin` sees every template regardless of flag or ownership** |

The flag is a simple on/off toggle: *on* = listed for everyone; *off* = owner-only (+ admin override).

---

# 3. Scope

## Owns

- The `visibility` column semantics on `certificate_templates`
- List/show access rules for `GET /api/v1/templates` and `GET /api/v1/templates/{id}`
- Visibility checks on all paths that expose template content (both clone endpoints, event template references)
- Accepting and validating `visibility` on create/update requests
- Frontend: visibility badge in template lists + toggle affordance

## Does Not Own

- Authentication / tenant checks (`jwt.auth`, `jwt.endpoint` — unchanged)
- Role derivation (`specs/auth/role-resolution.md`)
- Update/delete authorization between different users **for non-visibility fields** (unchanged by this spec; only the `visibility` field gains an author-or-admin guard per §5.3)
- `/api/v1/me/templates` (stays strictly author-scoped, unaffected by the flag)
- Public certificate verification/view endpoints (certificates, not templates)

---

# 4. Data Model

New column on `certificate_templates`:

```text
visibility  ENUM('public','private')  NOT NULL  DEFAULT 'private'
updated_by  STRING  NULL   -- opaque Auth sub; stamped on every successful create/update
```

| Decision | Value | Rationale |
|----------|-------|-----------|
| Default for **new** templates | `private` | Sharing is opt-in ("toggle on"); drafts stay personal by default |
| Backfill for **existing** rows | `public` | Preserves today's behavior on deploy day — nobody silently loses sight of colleagues' templates |
| Applies to | both `type = 'certificate'` and `type = 'email'` | Same table, same rule; no type-specific exceptions |

### Ownership stamps (never none)

- **Create** stamps `created_by = updated_by = caller.sub`.
- **Every successful update** (any field, not just `visibility`) re-stamps `updated_by = caller.sub`.
- **Owner set**: `owners(t) = unique({t.created_by, t.updated_by} \ {null})` — this set must **never be empty** for a row that the application wrote. In practice: fresh rows carry both stamps; rows edited later keep their creator *and* gain their last editor as co-owner.
- **Legacy rows** whose `created_by` is NULL (the column predates strict stamping) ship as `'public'` via the backfill; the first successful edit stamps `updated_by`, giving them an owner from then on.
- Display fallback when a single "author" is needed: `effective_author(t) = t.updated_by ?? t.created_by`.

Migration mechanics (per AI-RULES §11 — schema and data changes stay separate):

1. Schema migration: add `visibility` and `updated_by` columns with temporary server defaults (`'public'`, `NULL`).
2. Data migration: no-op for existing rows (already `'public'`; ownership arrives with first edit).
3. Switch application-level defaults to `'private'` / mandatory stamping in the model/controller layer (column default may be tightened in a follow-up schema migration).

---

# 5. API Contract Changes

## 5.1 Serialization

`formatTemplate()` (and the OpenAPI `Template` schema) gains:

```json
{ "visibility": "public", "created_by": "<sub>", "updated_by": "<sub or null>" }
```

`created_by` **must** be added to the payload — today it is write-only — together with the new `updated_by`. The frontend needs both to compute ownership (§6) and decide whether to offer the toggle (§7).

## 5.2 Create — `POST /api/v1/templates`

- Optional body field `visibility`, validated `in:'public','private'`.
- Omitted ⇒ stored as `private`.
- Stored verbatim; no coercion.
- Stamps: `created_by = updated_by = caller.sub` (owner set is complete from birth — never none).

## 5.3 Update — `PATCH /api/v1/templates/{id}`

- Optional body field `visibility`, same validation.
- **Only an owner or a `cert-admin` may change the flag** (owner set per §6).
  Others attempting it receive `403 Forbidden` — even if the template itself is visible to them.
- **Every successful update re-stamps `updated_by = caller.sub`**, regardless of which field changed. Consequence to note honestly: a `cert-admin` who edits someone's private template becomes a co-owner and retains visibility thereafter.
- All other update behavior (locking, name-conflict) unchanged.

## 5.4 List — `GET /api/v1/templates`

Visibility filter applied before pagination:

```text
visible(t) =  t.visibility = 'public'
           OR caller.sub ∈ owners(t)          -- §6.1
           OR caller.groups contains 'cert-admin'
```

- `total` / `has_more` reflect the **filtered** count.
- No new query parameters; the flag is not client-filterable beyond existing `type`/`search`.

## 5.5 Show — `GET /api/v1/templates/{id}`

```text
if !visible(template):
    return 404  (same shape as missing template)
```

**404, never 403** — avoids disclosing the existence of private templates to non-owners.

## 5.6 Referencing & cloning (content-exposure paths)

Template content reaches users through more than the show endpoint. **Every path that reads or copies template content applies the same `visible()` rule:**

| Path | Rule |
|------|------|
| `POST /events/{id}/clone-template` | Source must be `visible()`; otherwise `404` ("Certificate template not found." — existing shape). The clone is created with `visibility = 'private'` and `created_by = updated_by = caller.sub` — the cloner fully owns what they clone (this also fixes the current quirk of attributing clones to the source author) |
| `POST /events/{id}/clone-email-template` | Identical rule, `type = 'email'`; otherwise `404` ("Email template not found.") |
| `POST /events` / `PATCH /events/{id}` (`template_id`, `email_template_id`) | Referenced templates must be `visible()` at reference time; otherwise `422` on the corresponding field |
| Certificate issuance/PDF/email rendering | Renders whatever the event references — no additional check needed because the reference itself was validated |

**Grandfathering:** references are validated when attached. If a template later goes `private`, events already referencing it keep working (revoking mid-flight would strand issuance); new references re-validate.

Without §5.6, `show()` masking is decorative: any staff member could pass a private template's UUID to either clone endpoint and receive its full HTML/CSS as their own copy.

---

# 6. Ownership & Caller Resolution

## 6.1 Owner set

```text
owners(t)           = unique({t.created_by, t.updated_by} \ {null})
effective_author(t) = t.updated_by ?? t.created_by
```

- Both stamps count as owners ("default to both"); `updated_by` alone is the display-author fallback.
- **Never none**: application writes always stamp (§4); legacy unstamped rows are `public` until first edit.

## 6.2 Rules

```text
visible(t) = t.visibility = 'public'
          OR caller.sub ∈ owners(t)
          OR caller.groups contains 'cert-admin'

mayToggleVisibility(t) = caller.sub ∈ owners(t)
                      OR caller.groups contains 'cert-admin'
```

| Input | Source |
|-------|--------|
| `caller.sub` | JWT claims (`jwt.auth` middleware → `jwt_claims.sub`) |
| `caller.groups` | JWT claims (`cert_user.groups`; seeded groups `cert-admin`, `cert-staff`, `cert-user`) |

Role resolution details live in `specs/auth/role-resolution.md`; this spec consumes its outputs, it does not re-derive them.

---

# 7. Frontend (e-cert) Integration

- Template list rows render a badge (`Public` / `Private`) from the serialized field.
- The toggle is offered when: current role is `admin` (**any** template) or the current user is an owner — i.e. their session `sub` equals `created_by` **or** `updated_by`.
- Participants (`cert-user`, read-only) never see management endpoints; unaffected.
- No client-side filtering of other people's private templates — the API already omits/masks them. Filtering locally would only mask already-authorized data.

---

# 8. Staleness & Timing

| Concern | Detail |
|---------|--------|
| Flag changes | Take effect immediately server-side (DB-backed, not claim-derived) |
| Token TTL | Unaffected; no re-login needed to see visibility changes |
| Cached lists | None today; if caching is added later, visibility filters must run pre-cache |

---

# 9. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Filtering visibility in the frontend only | Server list/show must enforce; UI hiding is cosmetic |
| Returning 403 for someone else's private template | Existence disclosure — use 404 |
| Deriving visibility from the `permissions` claim | Visibility is row state + authorship, not a permission level |
| Letting any viewer flip someone else's flag | Only author or `cert-admin` may change `visibility` |
| Type-specific rules (email vs certificate) | One column, one rule, both types |
| Forgetting the backfill | Deploying with default-only migration makes all existing templates invisible to colleagues |
| Masking only `show()` while the clone endpoints / event references still serve content | Side doors defeat the whole feature — §5.6 paths are mandatory enforcement points |
| Attributing clones to the source author | The cloner must own the clone (and see it) — both stamps = caller on clone |
| Writing rows without stamps (ownerless templates) | `owners(t)` must never be empty — create/update always stamp; legacy unstamped rows stay `public` until first edit |

---

# 10. Guiding Principle

> **Authorship decides privacy; role decides reach.** A template is private unless its author shares it, and `cert-admin` oversight is unconditional.
