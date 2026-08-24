# LOA e-cert — Account Management (Password & Email)
## Product Assembly Component Specification

**Version:** 1.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Auth/Profile Module
**Audience:** Engineers, AI Development Agents

> **Related:** `specs/auth/session-handling.md`, `specs/auth/sso-fragment.md`, `specs/auth/role-resolution.md`.
> Credential enforcement is implemented in the **Auth Platform** (`auth.lyceumalabang.edu.ph`, Laravel `AuthController`).

---

# 1. Purpose

It answers:

> **"How do users change their password or email, given that e-cert holds no local identity?"**

e-cert is a pure client-side SPA delegating all identity to the Auth Platform. This spec defines the
ownership boundary for credential and identity-field management, and the exact UX e-cert renders on
its profile page.

---

# 2. Requirement (source of truth)

| Concern | Owner | e-cert role |
|---------|-------|-------------|
| Forgot password | Auth Platform (`POST /api/v1/auth/password/forgot` + hosted `/forgot-password`, `/reset-password` pages) | None — reached from the SSO login page |
| Reset password | Auth Platform (`POST /api/v1/auth/password/reset`) | None |
| Change password (authenticated) | Auth Platform (`PUT /api/v1/auth/password`, `POST /api/v1/auth/password/change-request`) | Link/button → Auth Platform account page. Never render credential fields in e-cert |
| Change email | **Not yet built** (no endpoint on Auth Platform) | Email shown **read-only** from JWT claims until the platform ships a verified-change flow |

Hard rules:

1. e-cert must not contain password fields, email-submission forms, or any logic that posts credentials.
2. Identity fields displayed on e-cert are derived from the access-token claims (`name`, `email`) — read-only.
3. After any Auth Platform identity change, e-cert picks up new values automatically on next token
   issue/refresh. No cache invalidation logic is added client-side.

---

# 3. Scope

## Owns

- Profile page "Account" section layout (read-only identity + outbound links)
- Removal of the Phase-D stub components (`UpdateEmailForm`, `ChangePasswordRequestForm`)
- The outbound link contract to the Auth Platform account/password page (§5)

## Does Not Own

- Password hashing, reset tokens, rate limiting, email verification (Auth Platform)
- The Auth Platform account UI itself (hosted there)
- JWT claim semantics beyond displaying them
- Admin user management (`specs/pages` — `/users`, admin-only)

---

# 4. Profile Page Contract

Location: `(participant)/my/profile/page.tsx`.

```
┌─ Account ───────────────────────────────────────────┐
│  Name    {claims.name}                     (static) │
│  Email   {claims.email}                    (static) │
│          "Email changes are managed by the          │
│           administrator."                           │
│  Role    {derived role}                             │
│  ─────────────────────────────────────────────      │
│  "Password changes are handled securely on the      │
│   authentication portal."                           │
│  [↗ Change password] → AUTH_BASE/forgot-password*   │
└─────────────────────────────────────────────────────┘
```

- `*` **Interim contract (verified against Auth Platform, 2026-08-24):** no authenticated account
  page exists on the platform (web routes: login, sso/login, sso/register, forgot-password,
  reset-password, activate, admin/* only). Until one is built, "Change password" links to
  `${AUTH_BASE_URL}/forgot-password` — the platform's email-verified reset flow works for any user.
  When the platform ships an authenticated account/password page, retarget this link.
  The button carries an external-link icon and opens in a **new tab** (`rel="noopener noreferrer"`).
- The email line carries the note above until the platform implements a verified change flow;
  no disabled input, no fake affordances.
- All three Phase-D stub components are deleted (`features/auth/components/update-email-form.tsx`,
  `features/auth/components/change-password-request-form.tsx`, and the unused local
  `my/profile/update-email-form.tsx`); no replacement forms are introduced.

---

# 5. Outbound contract (Auth Platform dependency)

| Dependency | Status | Used by |
|------------|--------|---------|
| Hosted forgot/reset pages | ✅ Exists (`/forgot-password`, `/reset-password`) | SSO login page + e-cert profile "Change password" (interim) |
| `PUT /api/v1/auth/password` + `change-request` | ✅ Exists (API ready, no web UI calls it) | future direct integrations |
| Hosted **account/password page** for logged-in users | ❌ Not built — verified via route list 2026-08-24 | e-cert profile link retargets to it when built |
| Verified **email change** flow | ❌ Not built | out of scope until platform support |

Open items to promote this spec to **Final**:

1. ~~Auth Platform confirms the account/password page URL~~ **Resolved (interim):** none exists;
   link targets `${AUTH_BASE_URL}/forgot-password` until an authenticated account page ships.
2. Auth Platform roadmap decision on verified email change (in scope there, never here).

---

# 6. Acceptance Criteria

1. `src/features/auth/components/update-email-form.tsx` and `change-password-request-form.tsx`
   are deleted; nothing imports them.
2. Profile page shows name + email read-only from token claims, plus one outbound
   "Change password" link — zero local credential forms.
3. Grep proves e-cert has no inputs of type `password` and no POSTs containing passwords.
4. Token refresh after a platform-side identity change reflects new name/email without extra code.
