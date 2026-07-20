# FAQ

This FAQ explains the rules and flows of the E-Cert system based on the role of the
currently logged-in user. Your role is determined when you log in by looking up your
membership in the organization (`user_memberships.role`). If you are not logged in you
are treated as a **Guest**.

> **How do I know my role?** After logging in, the system reads your role from your
> organization membership. Newly registered users start as **Participant** by default.
> Only an Admin can change a user's role.

## Roles at a glance

| Role         | Who they are                                  | Home after login |
|--------------|-----------------------------------------------|------------------|
| Admin        | Full system access                            | `/dashboard`     |
| Staff        | Manages certificates, events, templates       | `/dashboard`     |
| Participant  | Views own profile and own certificates        | `/my`            |
| Guest        | Not logged in (public visitor)                | `/` (verify)     |

---

## General questions

### What is E-Cert?
E-Cert is a digital certificate management system for organizations. It lets authorized
users create events, design certificate templates, issue certificates, and lets
recipients view and verify their own certificates.

### Do I need an account to verify a certificate?
No. Anyone (Guest) can verify a certificate using its certificate number at `/verify`
or view a public certificate at `/view/[id]`. No login required.

### How do I log in?
Go to `/login` and use your registered email and password. After login you are sent to
the home page for your role.

### I just registered. What can I do?
New accounts are created as **Participant**. You can update your profile and view the
certificates issued to your email address. You cannot create or issue certificates.

---

## Admin

**Full access to all features**, including everything Staff can do, plus deletion,
audit trail, and user/member management.

- Manage certificates, events, and templates (create, edit, issue).
- Delete certificates, events, templates, and members.
- View the audit trail / email logs.
- Manage organization members and users (assign roles, ban/unban, delete users).
- Cannot change your own role or ban/delete your own account (self-action is blocked).
- View all certificates across the organization.

**Flow:** Log in → `/dashboard` → access any management area (Events, Certificates,
Templates, Users).

---

## Staff

**All management features except deletion, audit trail, and user/member management.**

- Manage certificates, events, and templates (create, edit, issue).
- View all certificates across the organization.
- Issue certificates for events (only when the event status is not `draft` or `archive`).
- Cannot delete, view the audit trail, or manage users/members.

**Flow:** Log in → `/dashboard` → manage Events / Certificates / Templates.

---

## Participant

**Own profile and own certificates only.**

- View and update your own profile (`/my/profile`).
- View certificates issued to your email address only (`/my/certificates`).
- Download/save a PDF of a certificate only if it was issued to your email.
- Cannot see other recipients' certificates, and cannot access any dashboard or
  management screens.

**Flow:** Log in → `/my` → view your certificates or update your profile.

---

## Guest (not logged in)

- Verify a certificate by number at `/verify`.
- View a public certificate page at `/view/[id]`.
- No access to `/my`, `/dashboard`, or any management features. Attempting to visit a
  protected page redirects you to `/login`.

---

## Common flows

### Issuing certificates (Admin / Staff)
1. Create an event under **Events** (status must be active — not `draft` or `archive`).
2. Create or choose a certificate template under **Templates**.
3. Open the event and use the issue flow to generate certificates for attendees.
4. Optionally email certificates to recipients.

### Viewing my certificate (Participant)
1. Log in — you land on `/my`.
2. Go to **My Certificates** to see certificates issued to your email.
3. Open a certificate to view or download its PDF.

### Changing a user's role (Admin only)
1. Go to **Users** in the dashboard.
2. Select a user and assign a new role.
3. You cannot change your own role.

---

## Troubleshooting

**I can't access the dashboard.** The dashboard requires an Admin or Staff role.
Participants and Guests are redirected to `/my` or `/login`.

**I see fewer menu items than expected.** The sidebar is filtered by your role. Admins
see the most options; Staff see management items but not Users; Participants see only
their own area.

**My role looks wrong.** Roles are set by an Admin in the Users screen. Contact an
Admin if your access does not match your responsibilities.
