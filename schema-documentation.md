# Database Schema Documentation

> Source of truth: `supabase/schema.sql` (PostgreSQL / Supabase).
> This document extracts the schema and marks which tables belong to the auth domain (to be removed).

---

## Database Platform

- **Engine**: PostgreSQL (via Supabase).
- **Config**: `supabase/config.toml`; managed locally with `supabase` CLI.
- **Extensions / features used**: `gen_random_uuid()` (pgcrypto), `JSONB`, custom settings (`app.user_id` via `set_config`/`current_setting`), ROW LEVEL SECURITY, triggers (`plpgsql`), partial unique indexes, `ON CONFLICT` upserts.
- **Migrations**: `supabase/migrations/*.sql` (versioned, idempotent patterns in `schema.sql`).
- **Access patterns**: server code connects via `supabase-js` client (user-scoped with `app.user_id` set) or `supabaseAdmin` service-role client (`src/lib/supabase/admin.ts`) bypassing RLS.
- **Storage**: Supabase Storage bucket `certificates` holds rendered PDFs; referenced by `certificates.file_path`.

> ⚠️ **Migration planning note:** the schema relies on RLS + `current_user_id()` (custom GUC `app.user_id`) + `user_memberships` for authorization. A migration to an external API that bypasses RLS must re-implement authorization server-side and stop depending on these Postgres-specific mechanisms.

---

## JSONB Columns (data stored as JSON)

These are the unstructured payload columns — high priority when planning data migration, because their contents must be re-mapped to typed fields or migrated to a document store.

| Table | Column | Used shape (from code) | Notes |
| --- | --- | --- | --- |
| certificates | metadata | `{ rendered_pdf?: string, rendered_html?: string }` | `rendered_pdf` is a **base64-encoded PDF** (can be large — MBs). `rendered_html` is the rendered HTML string used to regenerate the PDF. Both are write-once caches; the PDF endpoints read them to serve downloads without re-rendering. |
| event_attendees | metadata | `{ generation_mode?: "template"\|"file", html?: string, file_data?: string, file_name?: string, file_type?: string }` | `file_data` is **base64 file content** (cert PDF source uploaded for the attendee), `file_name`/`file_type` describe it. `generation_mode` controls how the issue workflow builds the cert (template-rendered vs uploaded file). |
| audit_logs | details | free-form `{...}` per action | e.g. `{ certificate_number, recipient_name, event_name, ip_address, role, name }` — depends on the `action` string. Not strongly typed in code. |

> ⚠️ **Migration warning:** the two base64 blobs (`certificates.metadata.rendered_pdf`, `event_attendees.metadata.file_data`) are the heaviest payloads in the DB. If migrating to a separate object store, extract these out of JSONB into storage blobs and keep only references.

---

## Overview

The database is split into two logical groups:

- **Core domain tables** — the data this application actually manages (certificates, events, attendees, templates, audit). These stay.
- **Auth/identity tables** — used for self-hosted login/password auth. **These will no longer be used** once the app consumes an external API/auth provider. They should be deprecated and eventually dropped.

```
Core domain (KEEP)                      Auth / identity (DEPRECATE)
────────────────────                    ─────────────────────────────
organizations                            users
certificate_templates                   refresh_tokens
events                                  password_resets
certificates                            email_confirmations
event_attendees                         user_memberships
certificate_emails
certificate_sequences
audit_logs
```

> **Note on references:** `audit_logs.user_id` and `certificate_emails.sent_by` reference `users(id)`. When the auth tables are dropped, these two columns must be converted to opaque IDs (e.g. a provider `sub`/`subject` claim string) or made nullable without FK.

---

## Part A — Core Domain Tables (KEEP)

### organizations
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| name | TEXT | NOT NULL |
| slug | TEXT | UNIQUE NOT NULL |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes: `idx_organizations_slug` (slug).
- Triggers: `trg_organizations_updated_at`.
- RLS: enabled. Policy "Members can read org" (SELECT if org in user's memberships).

### certificate_templates
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| organization_id | UUID | FK → organizations(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| description | TEXT | |
| type | TEXT | NOT NULL `DEFAULT 'certificate'`, CHECK IN ('certificate','email','auth') |
| auth_process | TEXT | |
| html_content | TEXT | NOT NULL `DEFAULT ''` |
| css_content | TEXT | `DEFAULT ''` |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Constraints: UNIQUE(organization_id, name).
- Indexes: `idx_templates_auth_process` (partial unique, auth_process NOT NULL); `idx_cert_templates_org`; `idx_cert_templates_org_created`; `idx_cert_templates_type`.
- Triggers: `trg_cert_templates_updated_at`.
- RLS: members SELECT; admin/staff ALL.

### events
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| organization_id | UUID | FK → organizations(id) ON DELETE CASCADE |
| template_id | UUID | FK → certificate_templates(id) |
| email_template_id | UUID | FK → certificate_templates(id) |
| name | TEXT | NOT NULL |
| description | TEXT | |
| event_date | DATE | |
| location | TEXT | |
| organizer | TEXT | |
| certificate_title | TEXT | `DEFAULT 'Certificate of Participation'` |
| certificate_number_pattern | TEXT | NOT NULL `DEFAULT 'EPOCH'` |
| valid_until | DATE | |
| status | TEXT | NOT NULL `DEFAULT 'draft'`, CHECK IN ('draft','active','archive') |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes: `idx_events_org`; `idx_events_org_created`; `idx_events_status`; `idx_events_email_template`; `idx_events_template`.
- Triggers: `trg_events_updated_at`.
- RLS: members SELECT; admin/staff ALL.

### certificates
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| organization_id | UUID | FK → organizations(id) ON DELETE CASCADE |
| event_id | UUID | FK → events(id) ON DELETE CASCADE |
| template_id | UUID | FK → certificate_templates(id) |
| recipient_name | TEXT | NOT NULL |
| recipient_email | TEXT | NOT NULL |
| certificate_number | TEXT | NOT NULL |
| issued_at | TIMESTAMPTZ | `DEFAULT now()` |
| expires_at | TIMESTAMPTZ | |
| revoked_at | TIMESTAMPTZ | |
| revoke_reason | TEXT | |
| file_path | TEXT | |
| metadata | JSONB | holds `rendered_pdf` (base64 PDF) + `rendered_html` — see [JSONB Columns](#jsonb-columns-data-stored-as-json) |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes:
  - `certificates_number_active_unique` — UNIQUE(certificate_number) WHERE revoked_at IS NULL (allows re-issue of same number after revocation).
  - `certificates_event_email_unique` — UNIQUE(event_id, recipient_email) WHERE event_id IS NOT NULL.
  - `idx_certificates_org`; `idx_certificates_org_created`; `idx_certificates_event`; `idx_certificates_number`; `idx_certificates_email`.
- Triggers: `trg_certificates_updated_at`.
- RLS: members SELECT or recipient is the user (by email); admin/staff ALL.

### event_attendees
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| event_id | UUID | FK → events(id) ON DELETE CASCADE |
| organization_id | UUID | FK → organizations(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL |
| attended | BOOLEAN | NOT NULL `DEFAULT FALSE` |
| completed | BOOLEAN | NOT NULL `DEFAULT FALSE` |
| attended_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| certificate_id | UUID | FK → certificates(id) |
| certificate_number | TEXT | (added via idempotent ALTER + backfill) |
| metadata | JSONB | (file_data base64, file_name, file_type, generation_mode) — see [JSONB Columns](#jsonb-columns-data-stored-as-json) |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Constraints: UNIQUE(event_id, email).
- Indexes: `idx_attendees_event`; `idx_attendees_org`; `idx_attendees_completed` (event_id, completed); `idx_attendees_certificate`.
- Triggers: `trg_event_attendees_updated_at`.
- RLS: members SELECT; admin/staff ALL.

### certificate_emails
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| certificate_id | UUID | FK → certificates(id) ON DELETE CASCADE |
| sent_to | TEXT | NOT NULL |
| subject | TEXT | NOT NULL |
| sent_at | TIMESTAMPTZ | `DEFAULT now()` |
| sent_by | UUID | FK → users(id) ⚠️ **auth table reference — see Part B note** |
| status | TEXT | `DEFAULT 'sent'` |
| error_message | TEXT | |

- Indexes: `idx_certificate_emails_cert`.
- RLS: admins can view email logs.

### certificate_sequences
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| organization_id | UUID | FK → organizations(id) ON DELETE CASCADE |
| pattern | TEXT | NOT NULL |
| next_value | INTEGER | NOT NULL `DEFAULT 1` |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Constraints: PK (organization_id, pattern).
- Indexes: `idx_cert_sequences_org`.
- RLS: admin/staff ALL.

### audit_logs
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| organization_id | UUID | FK → organizations(id) ON DELETE CASCADE |
| user_id | UUID | FK → users(id) ON DELETE SET NULL ⚠️ **auth table reference — see Part B note** |
| user_email | TEXT | |
| action | TEXT | NOT NULL |
| source | TEXT | NOT NULL |
| entity_type | TEXT | |
| entity_id | UUID | |
| details | JSONB | free-form per action — see [JSONB Columns](#jsonb-columns-data-stored-as-json) |
| ip_address | TEXT | |
| user_agent | TEXT | |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes: `idx_audit_logs_org`; `idx_audit_logs_user`; `idx_audit_logs_action`; `idx_audit_logs_created`; `idx_audit_logs_entity`.
- RLS: admins can view audit logs.

---

## Part B — Auth / Identity Tables (DEPRECATE)

> **These tables are used exclusively by the self-hosted login/auth flow and will NOT be used anymore** once the application consumes an external API / auth provider. They are documented here for migration purposes only and should be removed from the final schema.

### users ⚠️ REMOVE
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL — remove (auth handled externally) |
| name | TEXT | |
| email_confirmed_at | TIMESTAMPTZ | |
| banned_until | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes: `idx_users_email`.
- Triggers: `trg_users_updated_at`.
- RLS: enabled (no explicit policy; protected via `current_user_id()` helper).
- **Dependents to resolve before drop:** `user_memberships.user_id` (CASCADE), `refresh_tokens.user_id` (CASCADE), `password_resets.user_id` (CASCADE), `email_confirmations.user_id` (CASCADE), `audit_logs.user_id` (SET NULL), `certificate_emails.sent_by`.

### refresh_tokens ⚠️ REMOVE
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| token_hash | TEXT | UNIQUE NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes: `idx_refresh_tokens_user`, `idx_refresh_tokens_hash`.
- RLS: none required.

### password_resets ⚠️ REMOVE
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| token_hash | TEXT | UNIQUE NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes: `idx_password_resets_user`, `idx_password_resets_hash`.

### email_confirmations ⚠️ REMOVE
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| token_hash | TEXT | UNIQUE NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |

- Indexes: `idx_email_confirmations_user`, `idx_email_confirmations_hash`.

### user_memberships ⚠️ REMOVE / REDESIGN
| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | UUID | PK, `DEFAULT gen_random_uuid()` |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| organization_id | UUID | FK → organizations(id) ON DELETE CASCADE |
| role | TEXT | NOT NULL `DEFAULT 'participant'`, CHECK IN ('admin','staff','participant') |
| created_at | TIMESTAMPTZ | `DEFAULT now()` |
| updated_at | TIMESTAMPTZ | `DEFAULT now()` |

- Constraints: UNIQUE(user_id, organization_id).
- Indexes: `idx_user_memberships_user_id`, `idx_user_memberships_org_id`.
- Triggers: `trg_user_memberships_updated_at`.
- RLS: user reads own memberships; admins add/remove.
- **Note:** `role` and org membership drive all `requireRole()` checks and RLS policies in the app. If auth moves externally, this table must either map the provider subject (e.g. `sub`, `email`) to `organization_id` + `role`, or roles must come from the API layer instead of the DB.

---

## Functions

### current_user_id()
Returns the `app.user_id` custom setting cast to UUID. Used by RLS policies.

### set_updated_at()
BEFORE UPDATE trigger function that stamps `NEW.updated_at = now()`.

### next_certificate_number(p_org_id UUID, p_pattern TEXT)
Atomically increments the per-org/pattern `certificate_sequences` counter and returns the next value (inserts row starting at 2, then `next_value + 1` on conflict).

### issue_certificate_atomic(p_org_id, p_event_id, p_template_id, p_recipient_name, p_recipient_email, p_certificate_number, p_expires_at, p_metadata)
Inserts a certificate and, when `p_event_id` is provided, links the matching attendee row (by event + email, where `certificate_id IS NULL`). Returns the new `certificates` row.

### revoke_certificate_atomic(p_cert_id UUID, p_reason TEXT)
Revokes a certificate (`revoked_at`, `revoke_reason`) if not already revoked, and unlinks the attendee's `certificate_id`.

---

## Triggers

| Trigger | Table | Action |
| --- | --- | --- |
| trg_organizations_updated_at | organizations | BEFORE UPDATE → set_updated_at() |
| trg_user_memberships_updated_at | user_memberships | BEFORE UPDATE → set_updated_at() |
| trg_cert_templates_updated_at | certificate_templates | BEFORE UPDATE → set_updated_at() |
| trg_events_updated_at | events | BEFORE UPDATE → set_updated_at() |
| trg_certificates_updated_at | certificates | BEFORE UPDATE → set_updated_at() |
| trg_event_attendees_updated_at | event_attendees | BEFORE UPDATE → set_updated_at() |
| trg_users_updated_at | users ⚠️ | BEFORE UPDATE → set_updated_at() — removed with auth tables |

## Row Level Security

RLS is enabled on all 10 tables. Policies authorize via `current_user_id()` → `user_memberships` (which references `users`). **If the auth tables are removed, every policy must be reworked** to authorize from the API layer instead (e.g. the API sets `app.user_id`, or RLS is disabled and access control moves server-side).

Policies by table:
- **organizations**: members SELECT
- **user_memberships**: users SELECT own; admins INSERT / DELETE
- **certificate_templates**: members SELECT; admin/staff ALL
- **events**: members SELECT; admin/staff ALL
- **event_attendees**: members SELECT; admin/staff ALL
- **certificates**: members SELECT or recipient email = user email; admin/staff ALL
- **certificate_sequences**: admin/staff ALL
- **certificate_emails**: admins SELECT
- **audit_logs**: admins SELECT

---

## Migration Notes (removing auth)

1. Drop in dependency order: `refresh_tokens`, `password_resets`, `email_confirmations`, `user_memberships`, then `users`.
2. Before dropping `users`, convert `audit_logs.user_id` and `certificate_emails.sent_by` to store an external provider identifier (e.g. `TEXT` holding the provider `sub` claim) or remove the FK.
3. Replace `user_memberships.role` semantics: either remap provider `sub`/email → role in a new `memberships` table, or enforce roles in the API layer and drop the table.
4. All RLS policies referencing `current_user_id()` / `users` must be rewritten or replaced by server-side authorization in the API.
5. `certificate_emails.sent_by` loses its FK to `users` — plan a data backfill if historical `sent_by` values matter.
