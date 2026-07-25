# Plan: Custom Email Template for Supabase Auth "Confirm Sign Up"

## Goal

Replace Supabase's default "Confirm Sign Up" email with a custom-branded template that matches the rest of the e-cert product, while continuing to use our existing Gmail SMTP sender (the same one used by `NodemailerProvider`).

We will do this via the **Supabase Send Email Hook** (an Edge Function that Supabase POSTs to whenever it needs to send an auth email). The hook will render our own HTML and send it through our existing SMTP, so branding, placeholders, and sender identity stay consistent with the certificate email flow.

## Why the Send Email Hook (not the built-in template override)

Supabase's `config.toml` does support `[auth.email.template.confirmation]` overrides, but:

- Subject + body only — no way to keep the visual style consistent with the rest of the product.
- Still goes through Supabase's built-in SMTP path; we lose our `SMTP_FROM` identity.
- No per-action logic (signup vs. magic link vs. recovery) and no template data injection from our DB.

The Send Email Hook gives us full control and uses the same Gmail SMTP that `src/lib/email/nodemailer.provider.ts` already uses today, so there's one email pipeline for the whole product.

## High-level flow

```
User signs up
   |
   v
Supabase Auth
   |
   v
Supabase POSTs { user, email_data } to our Edge Function
   (email_data.email_action_type === "signup")
   |
   v
Edge Function:
  1. Verifies webhook signature (SEND_EMAIL_HOOK_SECRET)
  2. Loads the "auth signup" template (or uses inline HTML) from
     certificate_templates where type = 'email' and purpose = 'auth_signup'
  3. Substitutes placeholders ({{ConfirmationURL}}, {{Token}}, {{SiteURL}},
     {{Email}}, {{Name}})
  4. Sends via Nodemailer through Gmail SMTP (SMTP_HOST/USER/PASS/FROM)
  5. Returns 200 with empty body
```

If anything fails the function returns 5xx, which causes Supabase to retry. We log to the standard Supabase function logs (and optionally a `auth_email_log` table if we want to mirror `certificate_emails`).

## Affected files

### New

- `supabase/functions/send-email/index.ts` — the hook handler.
- `supabase/functions/send-email/templates/auth-signup.html` — the branded HTML (or pull from DB; see step 4 below).
- `supabase/migrations/20260725_add_auth_email_templates.sql` — adds an `auth_email_templates` table (or extends `certificate_templates` with a `purpose` column) so the hook can read templates from the DB.
- `supabase/EMAIL_HOOK_PLAN.md` — this file.

### Modified

- `supabase/config.toml`
  - `[auth.email]` — set `enable_confirmations = true`.
  - `[auth.email.smtp]` — leave disabled (the hook will send instead of Supabase).
  - `[auth.hook.send_email]` — point at the deployed function.
- `.env.example`, `.env.local` — add `SEND_EMAIL_HOOK_SECRET`.
- `package.json` (optional) — if we add a `dev:functions` script using `supabase functions serve`.

## Step-by-step

### 1. Decide template source (DB vs. file)

Two options, pick one:

- **A. Inline in the Edge Function** (faster to ship, versioned with code, no DB round trip). Best if the template rarely changes.
- **B. Stored in `auth_email_templates` table** (editable without redeploy). Best if admins want to tweak the auth email from the existing template editor UI.

Recommendation: start with **A** for the confirmation email, then evaluate promoting it to **B** once we have the editor wiring validated. The certificate email pipeline already stores templates in `certificate_templates` (`type = 'email'`), so the migration path is straightforward — we can add a `purpose` column and reuse the existing editor.

### 2. Implement the Edge Function

File: `supabase/functions/send-email/index.ts`

Behavior:

- Reject anything that isn't `POST` with 400.
- Read raw body and headers; verify with `standardwebhooks@1.0.0` using `SEND_EMAIL_HOOK_SECRET` (the secret Supabase shows in Dashboard → Auth → Hooks; we strip the `v1,whsec_` prefix before passing to the lib, same pattern as the docs example).
- If verification fails, return 401.
- Parse `{ user, email_data }`. Currently we only customize `email_action_type === "signup"`; other action types return 200 with no send (so Supabase falls through to nothing — see step 5 for the caveat).
- For signup: load the template (DB or file), substitute placeholders, send via Nodemailer.
- Return `200 {}` on success; `500` on send failure so Supabase retries.

Required env vars on the function:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — mirror `.env.example`.
- `SEND_EMAIL_HOOK_SECRET` — set via `supabase secrets set`.

The function will reuse the same Gmail creds that `NodemailerProvider` uses today so there's a single source of truth for "our email sender." If we want to avoid duplicating values we can later refactor the Node-side provider to call the same Edge Function.

### 3. Add the template

Inline HTML for now (`supabase/functions/send-email/templates/auth-signup.html`). Reuse the design language from `email-block-builder-v2/block-definitions.ts:317` (`DEFAULT_EMAIL_TEMPLATE`) — same 600px container, Georgia font, neutral palette — so the signup email feels like part of the product.

Placeholders to support:

- `{{ConfirmationURL}}` — built from `email_data.token_hash` + `email_data.email_action_type` + `email_data.redirect_to`, format: `https://<project-ref>.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=...`.
- `{{Token}}` — the 6-digit OTP from `email_data.token`.
- `{{SiteURL}}` — `email_data.site_url`.
- `{{Email}}` — `user.email`.
- `{{Name}}` — `user.user_metadata.full_name` (fall back to email local-part).

The same template also needs a plain-text fallback for clients that strip HTML.

### 4. Database migration (only if we go with option B)

`supabase/migrations/20260725_add_auth_email_templates.sql`:

```sql
alter table certificate_templates
  add column if not exists purpose text
    check (purpose in ('certificate', 'email_certificate', 'auth_signup'))
    default 'certificate';

create unique index if not exists uq_certificate_templates_auth_signup
  on certificate_templates (event_id)
  where purpose = 'auth_signup';

alter table certificate_templates enable row level security;
-- policies: admins read/write; service role bypasses for the hook.
```

If we'd rather not touch the existing table, an alternative is a small standalone `auth_email_templates` table — simpler, but the editor UI won't pick it up without extra wiring.

### 5. Handle other `email_action_type` values

The hook will be called for every auth email (`signup`, `recovery`, `magiclink`, `email_change`, `invite`, `reauthentication`, plus the `*_notification` types). Two reasonable strategies:

- **Strict (recommended for v1):** only handle `signup`. For everything else, return 200 without sending — Supabase will not send anything, which will break password reset etc. Not acceptable for prod.
- **Practical:** handle `signup`, `recovery`, `magiclink`, `email_change`, `invite`, `reauthentication` with our own templates and fall through to Supabase's default for the rest (return 200 with a body that says "use default" — see docs; if not supported, send the email ourselves with a basic template).

For this plan we will **handle signup, recovery, magiclink, email_change, and invite** in v1 (the user-facing flows), and forward `reauthentication` and the `*_notification` types to Supabase's default by simply returning 200 with no action and documenting that those still use Supabase's built-in templates. We can revisit later.

### 6. Wire up the hook

Local:

- `supabase functions serve send-email` (requires `supabase` CLI + Docker).
- In `supabase/config.toml` add:

  ```toml
  [auth.hook.send_email]
  enabled = true
  uri = "http://host.docker.internal:54321/functions/v1/send-email"
  ```

  (For self-hosted Supabase. For Supabase Cloud in dev we use the deployed function URL.)

- Set the secret locally: `supabase secrets set SEND_EMAIL_HOOK_SECRET=v1,whsec_<generated>` (generate via the Dashboard or `openssl rand -base64 32`).

Production:

- `supabase functions deploy send-email --no-verify-jwt`.
- `supabase secrets set --env-file .env.production.functions` (containing `SMTP_*` + `SEND_EMAIL_HOOK_SECRET`).
- In Dashboard → Auth → Hooks, enable **Send Email** and select the `send-email` function. Copy the secret into `SEND_EMAIL_HOOK_SECRET` if it differs.

### 7. Enable confirmations

In `supabase/config.toml:225` change `enable_confirmations = false` to `true`. Important: this only takes effect for new signups; existing unconfirmed users still need to be re-invited.

### 8. Local testing

- Run `supabase start` + `supabase functions serve send-email`.
- Hit the Supabase Studio Inbucket (port 54324) to confirm the hook is bypassed — we send via Gmail directly, so the test is to watch the function logs (`supabase functions logs send-email`) and the recipient inbox.
- Trigger a signup with a real email we control, verify the branded email arrives, click the link, confirm the user is created.
- Verify a password recovery (`/forgot-password`) still works and uses our recovery template.

### 9. Production rollout

- Deploy the function, set secrets, enable the hook in the dashboard.
- Enable `enable_confirmations = true` on the project (Dashboard → Auth → Providers → Email).
- Monitor `supabase functions logs send-email` for the first 24h.
- Optional: add a one-off SQL to backfill `certificate_templates.purpose` for the signup template if we go with option B.

## Risks / open questions

- **Single sender, two pipelines.** After this change the same Gmail account sends both cert emails and auth emails. We should monitor Gmail's daily send cap (500 for free, 2000 for Workspace) — fine for now, may need Postmark/SES later.
- **Secret rotation.** `SEND_EMAIL_HOOK_SECRET` must match what Supabase expects; document rotation in `README.md`.
- **Hook payload drift.** Supabase may add fields; the function should ignore extras and not break.
- **Edge Function cold start.** First request after idle will be slow (~1-2s); acceptable for auth flows.
- **Test mode vs. prod sender.** Confirm whether we want signup emails in dev to go to real inboxes or only to Inbucket. With SMTP disabled in `config.toml`, Inbucket won't capture them — they will hit Gmail. We may want to branch the function on `SMTP_FROM` or a `ENV` var to fall back to Inbucket locally.

## Verification checklist

- [ ] `supabase functions deploy send-email` succeeds.
- [ ] `SEND_EMAIL_HOOK_SECRET` is set in both local and prod.
- [ ] Hook is enabled in Dashboard → Auth → Hooks.
- [ ] `enable_confirmations = true` on the project.
- [ ] Signup from a fresh email delivers the branded template.
- [ ] The confirmation link in the email verifies the user.
- [ ] Password recovery still works (recovery template or documented default).
- [ ] Magic-link and email-change flows still work or are explicitly out-of-scope for v1.
- [ ] `supabase functions logs send-email` shows no errors over 24h of normal traffic.

## Setup checklist (in order)

1. **Install the Supabase CLI** (skip if already installed):
   ```bash
   brew install supabase/tap/supabase   # macOS
   scoop install supabase               # Windows
   # or: npm install -g supabase
   ```

2. **Create a Gmail App Password** for `noreply.loa.econsultation@gmail.com`:
   Google Account → Security → 2-Step Verification → App passwords → "Mail" → copy the 16-char password.

3. **Deploy the function** from the project root:
   ```bash
   supabase login
   supabase link --project-ref odujtmhhguezexkpbhrw
   supabase functions deploy send-email --no-verify-jwt
   ```
   Note the printed function URL: `https://odujtmhhguezexkpbhrw.supabase.co/functions/v1/send-email`.

4. **Set the secrets** on the deployed function (use the real App Password, not your Gmail login):
   ```bash
   supabase secrets set \
     SMTP_HOST=smtp.gmail.com \
     SMTP_PORT=587 \
     SMTP_USER=noreply.loa.econsultation@gmail.com \
     SMTP_PASS=<gmail-app-password> \
     "SMTP_FROM=Certifire Admin" \
     SUPABASE_URL=https://odujtmhhguezexkpbhrw.supabase.co
   ```
   `SEND_EMAIL_HOOK_SECRET` is set in step 6, after Supabase generates it.

5. **Enable the hook** in the Dashboard:
   - Go to **Auth → Hooks → Send Email**
   - Select type **HTTPS** and choose the `send-email` function
   - Supabase fills in the URL automatically and shows a **Hook secret** — copy it

6. **Set the hook secret** returned by the Dashboard:
   ```bash
   supabase secrets set SEND_EMAIL_HOOK_SECRET=<secret-from-dashboard>
   ```
   Also paste it into `.env` as `SEND_EMAIL_HOOK_SECRET="..."` for local dev parity.

7. **Enable email confirmations**:
   - Dashboard → Auth → Providers → Email → toggle **Confirm email** on
   - Or in `supabase/config.toml`: set `[auth.email] enable_confirmations = true`

8. **Test**:
   ```bash
   supabase functions logs send-email --tail
   ```
   Then sign up a fresh user; verify the branded email arrives and the link confirms the account.
