# Self-Hosted Auth Plan

Replace Supabase Auth with an in-house authentication system. Supabase remains the database/storage provider — only the auth layer is replaced.

---

## Current Supabase Auth Usage

### What We Use

| Feature | Where | Notes |
|---------|-------|-------|
| Email + password login | `auth.actions.ts` | `signInWithPassword()` |
| Registration | `auth.actions.ts` | `signUp()` with `user_metadata.name` |
| Logout | `auth.actions.ts` | `signOut()` |
| Forgot password | `auth.actions.ts` | `resetPasswordForEmail()` |
| Update password | `auth.actions.ts` | `updateUser({ password })` |
| Update email | `auth.actions.ts` | `updateUser({ email })` |
| Get current user | `proxy.ts`, `permissions.ts`, API routes | `getUser()` |
| Code exchange | `auth/callback/route.ts` | `exchangeCodeForSession()` |
| Admin: list users | `user.service.ts`, `seed/`, `health/` | `admin.listUsers()` |
| Admin: create user | `seed/index.ts` | `admin.createUser()` |
| Admin: ban/unban | `user.service.ts` | `admin.updateUserById()` |
| Admin: delete user | `user.service.ts`, `seed/` | `admin.deleteUser()` |

### What We Don't Use

- OAuth / Social login
- Magic link / OTP
- MFA / TOTP / Passkeys
- Anonymous sign-in
- Edge Functions
- Auth Hooks
- Realtime subscriptions
- Custom email templates (using defaults)
- JWT claims (role resolved from DB, not JWT)
- `getSession()` (only `getUser()`)

---

## Proposed Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Password hashing | `bcrypt` (via `bcryptjs` for pure JS) |
| JWT | `jose` (Edge-compatible, no `jsonwebtoken`) |
| Session transport | HTTP-only cookies (same as current) |
| Email | Nodemailer (already in use for certificate emails) |
| Rate limiting | Existing proxy rate limiter |
| DB | Supabase Postgres (same, just no `auth.*` schema) |

### New Tables

```sql
-- Replaces Supabase auth.users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  email_confirmed_at TIMESTAMPTZ,
  ban_duration INTERVAL DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Password reset tokens
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email confirmation tokens
CREATE TABLE email_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### JWT Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "iat": 1234567890,
  "exp": 1234571490
}
```

- Short-lived access token (1 hour)
- Refresh token stored in `refresh_tokens` table (hashed)
- No role in JWT — resolved from `user_memberships` (same as now)

---

## File Structure

```
src/
├── lib/
│   ├── auth/
│   │   ├── index.ts              # Barrel export
│   │   ├── config.ts             # Auth constants (JWT secret, expiry, etc.)
│   │   ├── jwt.ts                # Sign/verify JWT using jose
│   │   ├── password.ts           # Hash/compare with bcryptjs
│   │   ├── session.ts            # Cookie management (get/set/clear session)
│   │   └── tokens.ts             # Refresh token + reset token utilities
│   └── email/
│       ├── nodemailer.provider.ts  # (existing)
│       └── auth-emails.ts       # Password reset, email confirmation templates
├── features/auth/
│   ├── server/
│   │   ├── auth.actions.ts       # (rewrite) register, login, logout, etc.
│   │   └── auth.repository.ts    # (rewrite) user CRUD operations
│   └── components/
│       ├── login-form.tsx        # (minor changes)
│       ├── register-form.tsx     # (minor changes)
│       ├── forgot-password-form.tsx  # (minor changes)
│       └── update-password-form.tsx  # (minor changes)
├── proxy.ts                      # (modify) replace supabase auth calls
└── lib/
    └── permissions.ts            # (modify) replace supabase auth calls
```

---

## Implementation Plan

### Phase 1: Core Auth Library ✅

1. **`lib/auth/config.ts`** — JWT secret, expiry, cookie names from env vars
2. **`lib/auth/password.ts`** — `hashPassword()`, `comparePassword()` using bcryptjs
3. **`lib/auth/jwt.ts`** — `signToken()`, `verifyToken()` using jose
4. **`lib/auth/session.ts`** — `setSessionCookie()`, `getSessionFromCookie()`, `clearSessionCookie()`
5. **`lib/auth/tokens.ts`** — Generate/verify refresh tokens, password reset tokens

### Phase 2: Database Schema ✅

6. Create migration for `users`, `password_resets`, `email_confirmations`, `refresh_tokens` tables
7. Update RLS policies to use new `users` table instead of `auth.users`
8. Add `auth.uid()` replacement function or modify policies to use `current_setting('request.jwt.claims')::json->>'sub'`

### Phase 3: Auth Actions ✅

9. **`auth.actions.ts`** — Rewrite all server actions:
   - `register()` — hash password, insert user, send confirmation email
   - `loginAction()` — verify password, create JWT, set cookies
   - `logout()` — clear cookies, delete refresh token
   - `forgotPassword()` — generate reset token, send email
   - `updatePassword()` — verify old password, hash new, update
   - `updateEmail()` — send confirmation to new email
   - `getCurrentUser()` — verify JWT, fetch user from DB

### Phase 4: Proxy & Permissions ✅

10. **`proxy.ts`** — Replace `supabase.auth.getUser()` with JWT verification + user lookup
11. **`permissions.ts`** — Replace `supabase.auth.getUser()` with session cookie read

### Phase 5: Email Templates ✅

12. Create custom HTML email templates for:
    - Password reset (with branded design)
    - Email confirmation
    - Welcome email
13. Use existing Nodemailer infrastructure

### Phase 6: Admin Operations ✅

14. **`user.service.ts`** — Replace `supabaseAdmin.auth.admin.*` with direct DB queries:
    - `listUsers()` → `SELECT * FROM users`
    - `createUser()` → `INSERT INTO users`
    - `banUser()` → `UPDATE users SET ban_duration`
    - `deleteUser()` → `DELETE FROM users`

### Phase 7: Seed & Health ✅

15. **`seed/index.ts`** — Replace `supabaseAdmin.auth.admin.createUser` with direct inserts
16. **`health/route.ts`** — Query `users` table directly

### Phase 8: Client Components ✅

17. **`auth/callback/route.ts`** — Replace Supabase code exchange with `confirmEmail` action
18. **`update-password/page.tsx`** — Pass token from query params to form
19. **`update-password-form.tsx`** — Accept token prop, use `resetPassword` for token flow

### Phase 8: Client Components

17. Update form components to use new server actions (minimal changes expected — mostly action names)
18. Remove `@supabase/ssr` dependency from auth-related code

---

## Migration Strategy

### Step 1: Dual-Run (Optional)

- Keep Supabase auth working alongside new auth
- Add feature flag: `USE_SELF_AUTH=true`
- Gradually migrate routes

### Step 2: Data Migration Script

```sql
-- Copy Supabase auth users to new users table
INSERT INTO users (id, email, name, created_at)
SELECT id, email, raw_user_meta_data->>'name', created_at
FROM auth.users
WHERE email_confirmed_at IS NOT NULL;
```

- Password hashes cannot be migrated (Supabase uses different bcrypt format)
- Users will need to reset passwords on first login after migration

### Step 3: Cutover

- Disable Supabase auth
- Remove `@supabase/ssr` from auth code
- Keep `@supabase/supabase-js` for database queries

---

## Environment Variables

```env
# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=3600

# Cookies
SESSION_COOKIE_NAME=session
SESSION_COOKIE_DOMAIN=localhost
SESSION_COOKIE_SECURE=false

# Password reset
RESET_TOKEN_EXPIRY=3600

# Email (existing Nodemailer config)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@lyceumalabang.edu.ph
```

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `bcryptjs` | Password hashing (pure JS, no native deps) |
| `jose` | JWT sign/verify (Edge-compatible) |

## Dependencies to Remove (eventually)

| Package | Reason |
|---------|--------|
| `@supabase/ssr` | No longer needed for auth cookies |

**Note:** `@supabase/supabase-js` stays — still used for database queries and storage.

---

## RLS Policy Changes

Current policies reference `auth.uid()`. Options:

### Option A: Session Variable (Recommended)

Set a Postgres session variable at the start of each request:

```sql
SET request.jwt.claims = '{"sub": "user-uuid"}';
```

Then replace `auth.uid()` with:

```sql
(current_setting('request.jwt.claims')::json->>'sub')::uuid
```

### Option B: Application-Level Only

Remove RLS policies entirely and rely on application-level guards (`requireSession()`, `requireRole()`).

- Simpler but less secure (defense in depth lost)
- Fine for single-org app with service-role bypass

### Option C: Hybrid

Keep RLS for critical tables (`certificates`, `events`) using Option A, remove for others.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Password migration | Users reset passwords; send notification email |
| JWT secret leaked | Use strong random secret; rotate periodically |
| Session fixation | Regenerate session on login |
| Email delivery | Already using Nodemailer; test thoroughly |
| RLS breakage | Test all policies with new auth; use Option A |

---

## Effort Estimate

| Phase | Days |
|-------|------|
| Phase 1: Core library | 1-2 |
| Phase 2: Schema + migration | 1 |
| Phase 3: Auth actions | 2-3 |
| Phase 4: Proxy + permissions | 1 |
| Phase 5: Email templates | 1 |
| Phase 6: Admin operations | 1 |
| Phase 7: Seed + health | 0.5 |
| Phase 8: Client components | 0.5 |
| Testing + bug fixes | 2-3 |
| **Total** | **10-12 days** |
