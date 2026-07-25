# E-Cert Improvement Plan

Full analysis of the certificate issuance system. Covers database portability, storage, transactions, email flow, security, performance, UX, and code quality.

---

## Table of Contents

1. [Database Portability & Migrations](#1-database-portability--migrations)
2. [Storage Layer](#2-storage-layer)
3. [Transaction Integrity & Atomicity](#3-transaction-integrity--atomicity)
4. [Email Flow](#4-email-flow)
5. [Security](#5-security)
6. [Performance & Scalability](#6-performance--scalability)
7. [UX & Display](#7-ux--display)
8. [Code Quality & Architecture](#8-code-quality--architecture)
9. [Recommended Priority Order](#9-recommended-priority-order)

---

## 1. Database Portability & Migrations

### Problem

Migrations are scattered across two locations with no consistent numbering:

```
supabase/
  migrations/
    20260724_add_email_templates.sql          <-- only file in the CLI-managed folder
  migration-cert-cascade.sql                  <-- loose files in root
  migration-cert-number-pattern.sql
  migration-cert-sequences-rls.sql
  migration-composite-indexes.sql
  migration-status-rename.sql
  schema.sql                                  <-- full rebuild, mixes schema + seed
```

Running `npx supabase db push` or `npx supabase db reset` only applies files in `migrations/`. The loose migration files are never applied automatically. If you transfer the database to a new project, you must manually figure out which loose files to run and in what order — a process prone to human error.

The `schema.sql` is a full "drop everything and recreate" script. It's useful for a clean start but unsuitable for incremental migration of a live database.

### Additional portability issues

| Issue | Location | Detail |
|-------|----------|--------|
| Hardcoded org ID | `src/lib/org.ts:1` | `ORG_ID = "d4444444-4444-4444-4444-444444444444"` — baked into the codebase. If you transfer to a new Supabase project, this UUID must match the new DB. |
| Hardcoded seed org | `supabase/schema.sql:355-357` | The INSERT uses the same fixed UUID. |
| Seed data in schema.sql | `supabase/schema.sql:369-388` | The `DELETE FROM auth.*` block wipes all auth users and has a production guard — this is dev-only behavior mixed into the schema file. |
| No supabase config for storage buckets | `supabase/config.toml` | Storage section is commented out. No bucket is configured. |
| ORG_ID not parameterized in service code | `src/features/users/server/user.service.ts`, `src/lib/seed/index.ts` | All service code imports ORG_ID directly. To change the org, you'd need to rebuild and redeploy. |

### Recommended fixes

1. **Consolidate all loose migration files into `migrations/` with sequential numbering.** Rename them with timestamps matching the CLI convention (e.g., `20260719000000_cert_cascade.sql`, `20260720000000_cert_number_pattern.sql`, etc.).

2. **Add a `supabase/seed.sql` file** (or keep the existing seed script) separate from schema. Remove the `DELETE FROM auth.*` block from `schema.sql` and put it only in a dedicated `supabase/seed-dev.sql`.

3. **Create a clean transfer script** (`scripts/export-schema.sh` or similar) that runs `npx supabase db dump --schema-only` and `npx supabase db dump` to produce a portable SQL dump. Document the transfer process.

4. **Add a migration for Supabase Storage bucket creation** — document the bucket setup required before storage works.

5. **Replace hardcoded ORG_ID with an environment variable** or at minimum make it configurable at the database level (e.g., a `settings` table).

---

## 2. Storage Layer

### Problem

The `LocalStorageProvider` (`src/lib/storage/local.provider.ts`) writes files to the local filesystem under `./storage`. On Vercel, serverless function filesystems are ephemeral — files vanish between invocations. Every file written via `uploadCertificateFileAction` or the CSV bulk upload flow is lost immediately.

This means:
- The "Upload PDF" mode on the issue form silently produces invalid `file_path` references.
- The CSV bulk upload with `file_path` column stores paths to nonexistent files.
- `getCertificatePdfBuffer` throws `ENOENT` for any certificate where `file_path` is set but the file is gone.
- The `download` route falls back to `metadata.rendered_pdf` or template-based regeneration, which works for system-generated certs but not for user-uploaded ones.

### What currently works despite this

For **template-generated** certificates, the PDF is rendered at issuance time and stored as `rendered_pdf` in `metadata` JSONB. The `getCertificatePdfBuffer` function checks `file_path` first, then falls back to `metadata.rendered_pdf`, then to `metadata.rendered_html` (re-render on demand). So system-generated certs work fine — the `file_path` path is only relevant for user-uploaded PDFs.

### Recommended fixes

1. **Replace `LocalStorageProvider` with `SupabaseStorageProvider`** using `@supabase/supabase-js` storage API. The bucket name should be `certificates`. Create it via the Supabase dashboard or a migration script.

2. **SupabaseStorageProvider implementation:**
   ```typescript
   // src/lib/storage/supabase.provider.ts
   // - writeFile: supabaseAdmin.storage.from('certificates').upload(path, buffer)
   // - readFile: supabaseAdmin.storage.from('certificates').download(path)
   //   → returns Buffer.from(await file.arrayBuffer())
   // - deleteFile: supabaseAdmin.storage.from('certificates').remove([path])
   // - getSignedUrl: supabaseAdmin.storage.from('certificates').createSignedUrl(path, 604800)
   //   → returns signed URL (7-day expiry)
   // - fileExists: supabaseAdmin.storage.from('certificates').getMetadata(path)
   ```

3. **Update `src/lib/storage/index.ts`** to use `SupabaseStorageProvider` instead of `LocalStorageProvider`.

4. **Add cleanup mechanism:**
   - Hook into `revokeCertificate` to also delete the stored file.
   - Hook into `deleteEvent` cascade cleanup to remove files.
   - Create `DELETE /api/storage/cleanup` endpoint for manual orphan cleanup (lists bucket objects, cross-references `certificates.file_path`).

5. **Document required bucket creation** in the migration/setup docs:
   ```sql
   -- Via Supabase Dashboard > Storage > New Bucket
   -- Name: certificates
   -- Public: false
   -- File size limit: 5MB
   -- Allowed MIME types: application/pdf
   ```

6. **The `metadata.rendered_pdf` base64 storage pattern should remain as a fallback** but should not be the primary storage mechanism. Consider moving rendered PDFs to storage on-demand (lazy migration) when serving them.

---

## 3. Transaction Integrity & Atomicity

### Problem

Certificate issuance involves multiple database operations that are not wrapped in a transaction:

```
1. Generate certificate number (INSERT/UPDATE on certificate_sequences)
2. Render template → HTML → PDF (no DB)
3. INSERT into certificates table
4. UPDATE event_attendees.certificate_id (for bulk/workflow)
5. INSERT into certificate_emails (if email sent)
```

If any step fails after step 3 succeeds, you get orphaned data:
- Certificate created but attendee not linked
- Certificate created but email log not written

Similarly, in the workflow (`workflows/issue-certificates.ts`), each attendee is processed independently — if the workflow crashes at attendee #50, attendees 1-49 have certificates but no compensation is available.

### Recommended fixes

1. **Create a PostgreSQL function** `issue_certificate_atomic(...)` that wraps steps 1-4 in a single transaction:

   ```sql
   CREATE OR REPLACE FUNCTION issue_certificate_atomic(
     p_org_id UUID,
     p_event_id UUID,
     p_template_id UUID,
     p_recipient_name TEXT,
     p_recipient_email TEXT,
     p_certificate_number TEXT,
     p_expires_at TIMESTAMPTZ,
     p_metadata JSONB
   ) RETURNS certificates AS $$
   DECLARE
     v_cert certificates%ROWTYPE;
   BEGIN
     INSERT INTO certificates (organization_id, event_id, template_id,
       recipient_name, recipient_email, certificate_number,
       expires_at, metadata)
     VALUES (p_org_id, p_event_id, p_template_id,
       p_recipient_name, p_recipient_email, p_certificate_number,
       p_expires_at, p_metadata)
     RETURNING * INTO v_cert;

     IF p_event_id IS NOT NULL THEN
       UPDATE event_attendees
       SET certificate_id = v_cert.id, updated_at = now()
       WHERE event_id = p_event_id AND email = p_recipient_email
         AND certificate_id IS NULL;
     END IF;

     RETURN v_cert;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Call this function via `supabase.rpc('issue_certificate_atomic', ...)`** from `certificate.service.ts` instead of the current direct INSERT + separate UPDATE.

3. **For the bulk workflow**, add compensation: if email fails after certificate is created, log the failure but still mark the certificate as successfully issued. Currently, the workflow returns `success: false` for email failures, which is misleading — the certificate IS issued, only the email failed.

4. **Add a unique constraint** on `certificates(event_id, recipient_email)` to prevent duplicate issuance:

   ```sql
   ALTER TABLE certificates ADD CONSTRAINT certificates_event_email_unique
     UNIQUE (event_id, recipient_email);
   ```

5. **On revocation**, also clean up the attendee record:

   ```sql
   CREATE OR REPLACE FUNCTION revoke_certificate(p_cert_id UUID, p_reason TEXT)
   RETURNS void AS $$
   BEGIN
     UPDATE certificates SET revoked_at = now(), revoke_reason = p_reason
     WHERE id = p_cert_id AND revoked_at IS NULL;

     UPDATE event_attendees SET certificate_id = NULL, updated_at = now()
     WHERE certificate_id = p_cert_id;
   END;
   $$ LANGUAGE plpgsql;
   ```

---

## 4. Email Flow

### Problem

When `issueCertificate` is called with `send_email: true`, it passes `skip_pdf: true` to `sendCertificateEmail` (`certificate.service.ts:158`). This means the email goes out **without the PDF attachment** — the recipient gets a notification but no actual certificate file.

The standalone `sendCertificateEmailAction` (called from the email history UI) does NOT pass `skip_pdf`, so it DOES include the PDF. This inconsistency means:
- Issuing a cert with "send email" → email without PDF
- Manually resending from the detail page → email with PDF

### Additional email issues

| Issue | Location | Detail |
|-------|----------|--------|
| Email provider `NodemailerProvider` checks `window` on server | `nodemailer.provider.ts:11-15` | `typeof window !== "undefined"` will always be false on the server, so the debug logging is never triggered. The `isLocalhost` check at the top of `certificate-email.service.ts:14-16` has the same issue. |
| `email-history.tsx` fetches all logs but only displays the latest | `email-history.tsx:46` | The component calls `getEmailLogsAction` which returns all logs, but only shows the last successful one. Full history is in the UI but not displayed. |
| Activity feed mixes email_sent with certificate_issued | `dashboard.service.ts:91-109` | The two event types are merged into one list and sorted by timestamp, but they represent different things. An email "sent" before the certificate was "issued" in the feed is confusing. |

### Recommended fixes

1. **Remove `skip_pdf: true` from `issueCertificate` when `send_email` is true** (`certificate.service.ts:158`). Change:
   ```typescript
   const emailResult = await sendCertificateEmail(certificate.id, data.user_id, undefined, { skip_pdf: true });
   ```
   to:
   ```typescript
   const emailResult = await sendCertificateEmail(certificate.id, data.user_id);
   ```
   Only pass `skip_pdf: true` when explicitly requesting a no-attachment email.

2. **Fix the `isLocalhost` check** — move it to a utility that checks the actual server environment rather than `window`:

   ```typescript
   // Use process.env.NODE_ENV or process.env.VERCEL instead of window check
   const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL !== '1';
   ```

3. **Display the full email history** in the `EmailHistory` component — show all logs, not just the latest.

4. **Separate certificate_issued and email_sent in the activity feed** — use distinct icons/labels, or only show certificate issuances as activity items and keep email logs in a separate tab.

---

## 5. Security

### Problems found

| Severity | Issue | Location | Detail |
|----------|-------|----------|--------|
| **High** | XSS via template variables | `certificate-viewer.tsx:115` | `dangerouslySetInnerHTML={{ __html: certHtml }}` renders user-controlled data (recipient_name, event_name, etc.) without sanitization. A malicious template or recipient name could execute arbitrary JavaScript. |
| **High** | Hardcoded health check password | `api/health/route.ts:4` | `HEALTH_PASSWORD = "admin@lyceumalabang.edu.ph"` is in source code. Anyone with repo access can use the health endpoint to reseed users or dump auth details. |
| **High** | `.env` file committed to repo | Root `.env` and `.env.local` | Both contain production SMTP credentials and Supabase service role keys. `.gitignore` has `.env*` but these files exist — verify they are actually ignored. |
| **Medium** | In-memory rate limiting is per-invocation | `rate-limit.ts` | On Vercel, each serverless function invocation has its own `Map`. Rate limiting is ineffective unless the function stays warm (which it won't on the free tier). |
| **Medium** | Verify API returns full recipient details | `api/verify/[number]/route.ts:68-88` | The public verification endpoint returns `recipient_name`, `organization.name`, and event details. This is a privacy concern — anyone can enumerate certificates by number and see who they were issued to. |
| **Medium** | `supabaseAdmin` imported alongside user client | `certificate-email.service.ts:10` | The email service imports both `createClient` (user-scoped) and `supabaseAdmin` (service role). It uses the user client for reads but `supabaseAdmin` for email logs. This mixed use can lead to RLS bypass if the wrong client is used accidentally. |
| **Low** | Proxy header injection | `proxy.ts:90-93` | The middleware sets `x-user-role` from the database. If a user's membership record is manipulated (e.g., SQL injection via another vector), the role header could be spoofed for downstream server actions that trust it. |
| **Low** | CSRF check doesn't cover GET with side effects | `proxy.ts:30-57` | The CSRF check only validates POST requests. Some GET endpoints (like `/api/health` PUT reseed) should also be CSRF-protected. |

### Recommended fixes

1. **Sanitize template variables** before rendering:
   ```typescript
   function sanitizeHtml(str: string): string {
     return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
   }
   ```
   Apply this to all user-controlled variables before inserting into HTML templates.

2. **Move the health check password to an environment variable:**
   ```typescript
   const HEALTH_PASSWORD = process.env.HEALTH_PASSWORD;
   ```
   And remove it from source code.

3. **Verify `.env*` is actually gitignored.** Run `git ls-files --cached .env*` to check. If they are tracked, remove them from the index: `git rm --cached .env .env.local`.

4. **Use a distributed rate limiter** — Vercel's built-in rate limiting, or Upstash Redis, or Supabase Edge Functions with a database-backed counter. The in-memory `Map` is effectively no rate limiting on serverless.

5. **Reduce verify API data** — return only `certificate_number`, `status`, `issued_date`, `valid_until`, and `organization.name`. Don't return `recipient_name` in the public endpoint unless explicitly needed.

6. **Add CSRF protection to state-changing GET endpoints** — or better, convert them to POST/DELETE.

---

## 6. Performance & Scalability

### Problems

| Issue | Location | Detail |
|-------|----------|--------|
| Unbounded certificate listing | `certificate.repository.ts:10-18` | `findByOrganizationId` returns ALL certificates for an org with no pagination. At 1000+ certificates, this query becomes slow and the response payload large. |
| Dashboard stats N+1 | `dashboard.service.ts:17-31` | Fetches all certificate IDs, then counts emails with an `IN` clause. For orgs with thousands of certs, the `IN` clause is slow. |
| Template rendering on every view | `certificate-viewer.tsx:37-49` | Template variables are substituted client-side on every page load. For certificates without cached `rendered_html`, the download route re-renders the template and converts to PDF on every request. |
| Browser singleton for PDF | `lib/pdf/index.ts:8-26` | The Puppeteer browser instance is cached in module scope. On Vercel, each function invocation creates a new instance (cold start), making the first PDF generation slow (~2-5 seconds). |
| `findMany` with empty string filter | `base.repository.ts:34-36` | If a filter value is `""`, the function returns `[]` immediately. This is intentional but undocumented — callers may not realize empty strings cause silent no-results. |
| Attendee FK join fallback | `attendee.repository.ts:13-33` | If the FK join fails (e.g., the relationship name is wrong), it falls back to a non-join query. This silently degrades performance and masks schema issues. |

### Recommended fixes

1. **Add pagination to certificate listing:**
   ```typescript
   // certificate.service.ts
   export async function getCertificates(organizationId: string, options?: {
     limit?: number; offset?: number;
   }): Promise<Certificate[]> {
     return certRepo.findByOrganizationId(organizationId, {
       limit: options?.limit ?? 50,
       offset: options?.offset ?? 0,
     });
   }
   ```

2. **Replace dashboard stats with a single SQL query:**
   ```sql
   SELECT
     (SELECT count(*) FROM certificates WHERE organization_id = $1) AS total,
     (SELECT count(*) FROM certificates WHERE organization_id = $1 AND revoked_at IS NULL) AS active,
     (SELECT count(*) FROM certificates WHERE organization_id = $1 AND revoked_at IS NOT NULL) AS revoked,
     (SELECT count(*) FROM certificate_emails ce
      JOIN certificates c ON ce.certificate_id = c.id
      WHERE c.organization_id = $1) AS total_emails;
   ```

3. **Cache rendered PDFs to storage on first generation** — when `getCertificatePdfBuffer` regenerates from `rendered_html`, save the result to Supabase Storage and update `file_path` so subsequent requests serve the cached file.

4. **Fix the attendee repository FK join** — verify the relationship name matches the actual FK constraint, or remove the fallback and fix the join properly.

---

## 7. UX & Display

### Problems

| Issue | Location | Detail |
|-------|----------|--------|
| No confirmation before bulk issuance | `attendee.actions.ts:90-99` | `issueCertificatesForCompletedAction` issues certificates immediately with no confirmation. |
| Issue form doesn't clear success state on new errors | `issue-form.tsx:75-84` | If a new submission errors, the previous success message may still be visible briefly. |
| Certificate viewer shows "PREVIEW" watermark for real certificates | `certificate-viewer.tsx:126-134` | The watermark is always visible, even for certificates the user is trying to download/print. |
| No loading state for certificate view page | `view/[id]/page.tsx` | The page fetches data via API but the loading state is basic. |
| Email history "send" button has no debounce protection | `email-history.tsx:31-43` | Clicking "Send" multiple times rapidly could send duplicate emails. |
| Event attendees page has no CSV upload feedback | `upload-csv-form.tsx` | The CSV upload flow is complex but errors during upload are not always clearly displayed. |
| No certificate expiry warning | Various | Certificates approaching expiry are not flagged in the dashboard or certificate list. |

### Recommended fixes

1. **Add confirmation dialog** before bulk issuance and single issuance.
2. **Clear success message** when a new submission starts.
3. **Remove the "PREVIEW" watermark** for authenticated users viewing their own certificates.
4. **Add loading skeletons** for certificate and event detail pages.
5. **Disable the send button** after clicking until the operation completes.
6. **Add expiry warnings** — flag certificates expiring within 30 days in the dashboard.

---

## 8. Code Quality & Architecture

### Problems

| Issue | Location | Detail |
|-------|----------|--------|
| `env.ts` is not used | `src/lib/env.ts` | The Zod-validated env module exists but is not imported anywhere. Code reads `process.env` directly, bypassing validation. |
| Duplicate `renderTemplate` functions | `certificate.service.ts:14-29`, `api/certificates/[id]/download/route.ts:10-24` | The same template rendering function is copy-pasted in two files. |
| Duplicate `ORG_ID` definition | `src/lib/org.ts:1`, `src/lib/seed/index.ts:1` | `ORG_ID` is defined in two places with the same value. |
| Mixed `supabaseAdmin` and `createClient` usage | Throughout | Some services inject a client, others hardcode `supabaseAdmin`. This inconsistency makes it harder to reason about RLS behavior. |
| `console.log` debug statements everywhere | `attendee.service.ts`, `certificate-email.service.ts`, `attendee.repository.ts` | Production code has extensive debug logging that should use a proper logger or be conditionally compiled out. |
| `any` types in `BaseRepository` | `base.repository.ts:4` | `type SupabaseInsert = Record<string, any>` — the `any` type weakens TypeScript's type safety. |
| No input validation with Zod | `certificate.actions.ts`, `attendee.actions.ts` | Server actions accept raw objects without schema validation. Malformed input can cause runtime errors. |
| `getMyOrganizationsAction` passes empty string | `organization.actions.ts:15` | `orgService.getUserOrganizations("")` passes an empty string for userId, which will always return no results. |
| Unused `file_path` parameter in issue form | `issue-form.tsx:37-53` | The form uploads a file and gets a `filePath`, but the issue action passes it as `file_path` which is never used by `issueCertificate` (it only uses `existing_pdf_base64`). |

### Recommended fixes

1. **Import and use `env.ts`** everywhere instead of reading `process.env` directly.
2. **Extract `renderTemplate` into a shared utility** (`src/lib/template-renderer.ts`).
3. **Remove the duplicate `ORG_ID`** from `seed/index.ts` — import from `lib/org.ts`.
4. **Standardize client injection** — all services should accept a `client` parameter and default to `createClient()` for user-scoped operations. Use `supabaseAdmin` only for admin-level operations (user management, email logs, verification).
5. **Replace `console.log` with a proper logger** (e.g., `pino` or a simple wrapper that respects `NODE_ENV`).
6. **Add Zod validation schemas** for all server action inputs.
7. **Fix `getMyOrganizationsAction`** — pass the actual user ID from the session.
8. **Remove or repurpose the `file_path` parameter** in the issue form — it's dead code.

---

## 9. Recommended Priority Order

### Phase 1: Critical (do first)

| # | Task | Files | Impact | Status |
|---|------|-------|--------|--------|
| 1 | Consolidate migration files into `migrations/` | `supabase/migrations/` | Database portability — the core requirement | Pending |
| 2 | ~~Replace `LocalStorageProvider` with `SupabaseStorageProvider`~~ | ~~`src/lib/storage/`~~ | ~~File upload feature broken on Vercel~~ | **Done** |
| 3 | Fix email sending to include PDF attachment on issuance | `certificate.service.ts:158` | Users don't get their certificate PDF | Pending |
| 4 | Remove hardcoded credentials from source | `api/health/route.ts:4`, `.env*` | Security — credentials in repo | Pending |
| 5 | Sanitize template variables (XSS fix) | `certificate-viewer.tsx`, `certificate.service.ts` | Security — XSS vulnerability | Pending |

### Phase 2: Important (do next)

| # | Task | Files | Impact | Status |
|---|------|-------|--------|--------|
| 6 | Add unique constraint on `certificates(event_id, recipient_email)` | Schema migration | Prevent duplicate issuance | Pending |
| 7 | Create `issue_certificate_atomic` PL/pgSQL function | Schema migration | Transaction integrity | Pending |
| 8 | ~~Hook cleanup into revocation/deletion flows~~ | ~~`certificate.service.ts`, `event.service.ts`~~ | ~~Storage cleanup on revoke~~ | **Done** |
| 9 | Replace in-memory rate limiter with distributed solution | `lib/rate-limit.ts`, `proxy.ts` | Rate limiting ineffective on serverless | Pending |
| 10 | Add pagination to certificate listing | `certificate.service.ts`, `certificate.repository.ts` | Performance at scale | Pending |

### Phase 3: Quality (polish)

| # | Task | Files | Impact |
|---|------|-------|--------|
| 11 | Extract shared `renderTemplate` function | `certificate.service.ts`, `download/route.ts` | Code deduplication |
| 12 | Add Zod validation to server actions | `*.actions.ts` files | Input validation |
| 13 | Use `env.ts` everywhere instead of direct `process.env` | Throughout | Type-safe env vars |
| 14 | Remove `console.log` debug statements | Throughout | Production cleanliness |
| 15 | Fix `getMyOrganizationsAction` empty string bug | `organization.actions.ts` | Broken feature |
| 16 | Add confirmation dialogs for destructive actions | UI components | UX safety |
| 17 | Reduce public verify API data exposure | `api/verify/[number]/route.ts` | Privacy |
| 18 | Separate dashboard activity feed event types | `dashboard.service.ts` | UX clarity |
