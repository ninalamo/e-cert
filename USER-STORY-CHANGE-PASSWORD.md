# User Story: Change Password (Authenticated User)

## Story
As a logged-in user, I must be able to update my password. The process goes through:
**Change Password button → Email sent → Change Password page → Confirm Change Password**

No code (verification code) required — token link only.

---

## Current State Analysis

### What Exists

| Component | Route | Status |
|-----------|-------|--------|
| Profile page | `/my/profile` | Has email update only — **no password change** |
| Forgot password | `/forgot-password` | Works — sends reset email with token link |
| Update password (with token) | `/update-password?token=...` | Works — lets user set new password via link |
| Update password (no token) | `/update-password` | Works — direct change, **no email verification, no old password** |
| `password_reset` auth process | DB schema | Defined but **never used** |
| Auth email templates | `/templates/auth-emails` | Supports `forgot_password`, `password_reset` processes |

### What's Missing

1. **No entry point** — Profile page has no "Change Password" button or section
2. **No email-triggering action** — No server action for logged-in users to request a password change via email
3. **No confirmation email** — After password is changed, no "password changed" notification is sent (the `password_reset` template is unused)

---

## Target Flow

```
┌─────────────────────────────────────────────────┐
│  1. Profile Page (/my/profile)                  │
│     └─ "Change Password" button                 │
└──────────────────────┬──────────────────────────┘
                       │ Click
                       ▼
┌─────────────────────────────────────────────────┐
│  2. Server Action                               │
│     └─ Generate reset token                     │
│     └─ Send email to user's own email           │
│     └─ Show "Check your email" confirmation     │
└──────────────────────┬──────────────────────────┘
                       │ Email received
                       ▼
┌─────────────────────────────────────────────────┐
│  3. Email                                       │
│     └─ Contains link: /update-password?token=...│
│     └─ "Click to change your password"          │
└──────────────────────┬──────────────────────────┘
                       │ Click link
                       ▼
┌─────────────────────────────────────────────────┐
│  4. Change Password Page (/update-password)     │
│     └─ Enter new password                       │
│     └─ Submit                                   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  5. Confirmation                                │
│     └─ "Password updated" success message       │
│     └─ (Optional) Send "password changed" email │
│     └─ Redirect to profile or home              │
└─────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Create Branch
- Branch name: `feat/change-password-email-flow`

### Step 2: Profile Page — Add "Change Password" Section
**File:** `src/app/(participant)/my/profile/page.tsx`

- Add a new `Card` below the existing email update card
- Include a "Change Password" button that calls a server action
- Show loading/sent states inline

### Step 3: Create Server Action
**File:** `src/features/auth/server/auth.actions.ts`

Add `requestPasswordChange()` action:
- Verify session (must be logged in)
- Generate reset token via `createResetToken(userId)`
- Send password reset email to user's own email via `sendPasswordResetEmail(email, token)`
- Return success message

### Step 4: Create Change Password Form Component
**File:** `src/features/auth/components/change-password-request-form.tsx` (new)

Client component with:
- Button: "Send Password Change Link"
- Loading state while email is being sent
- Success state: "Check your email for the password change link"
- No password inputs needed — just triggers the email

### Step 5: (Optional) Send Confirmation Email After Password Change
**File:** `src/features/auth/server/auth.actions.ts`

Modify `resetPassword()` or `updatePassword()` to:
- After successful password update, send a "password changed" confirmation email
- Use the `password_reset` auth process template
- Create `sendPasswordChangedEmail(email, name)` in `auth-emails.ts`

### Step 6: (Optional) Add to Sidebar/Navigation
**File:** `src/components/sidebar.tsx` or participant navigation

- Add a "Change Password" link in the participant navigation (if desired)

---

## Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(participant)/my/profile/page.tsx` | Modify | Add Change Password card |
| `src/features/auth/server/auth.actions.ts` | Modify | Add `requestPasswordChange()` action |
| `src/features/auth/components/change-password-request-form.tsx` | Create | Client component for triggering password change email |
| `src/lib/email/auth-emails.ts` | Modify | Add `sendPasswordChangedEmail()` (optional) |

---

## Reusable Infrastructure

| Existing | Reuse For |
|----------|-----------|
| `createResetToken()` | Generating token for logged-in user |
| `sendPasswordResetEmail()` | Sending the change password email |
| `/update-password?token=...` page | The password change page (already works) |
| `forgotPassword()` action | Logic is similar — can refactor or call directly |
| `password_reset` auth process | Confirmation email template (currently unused) |

---

## Open Questions

1. **Should the button trigger email immediately**, or show a form first (e.g., enter current password)?
2. **After password is changed**, send a confirmation email? (The `password_reset` template exists but is unused)
3. **Add to sidebar navigation** or keep it only on the profile page?
4. **Rate limiting** on password change email requests?
