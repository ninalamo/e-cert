# Route and API Endpoint Documentation

## Summary Table

| Type | Count |
| --- | --- |
| Web Routes (pages) | ~30 |
| Route Handlers (non-API) | 2 |
| Workflow Endpoints (.well-known) | 3 |
| API Routes (/api) | 11 |
| Form Submissions | 1 |
| Server Actions (candidate API endpoints) | ~75 |
| Client-Side fetch() Calls | 6 |

## Web Routes (Client-facing pages)

### Auth
- **/(auth)/login**: Login page.
- **/(auth)/register**: Registration page.
- **/(auth)/forgot-password**: Request a password reset.
- **/(auth)/update-password**: Update password using a reset token.

### Dashboard
- **/(dashboard)/dashboard**: Landing page with stats and recent activity.
- **/(dashboard)/users**: User management (list, roles, ban/unban, delete).
- **/(dashboard)/events**: Event list.
- **/(dashboard)/events/new**: Create a new event.
- **/(dashboard)/events/[id]**: Event detail, attendees, fields, template.
- **/(dashboard)/events/[id]/upload**: Upload attendees via CSV.
- **/(dashboard)/events/[id]/issue**: Issue certificates for an event.
- **/(dashboard)/certificates**: Certificate list.
- **/(dashboard)/certificates/issue**: Issue a single certificate.
- **/(dashboard)/certificates/[id]**: Certificate detail, audit log, email history.
- **/(dashboard)/templates/certificates**: Certificate templates.
- **/(dashboard)/templates/certificates/new**: Create certificate template.
- **/(dashboard)/templates/certificates/[id]**: Edit certificate template.
- **/(dashboard)/templates/emails**: Email templates.
- **/(dashboard)/templates/emails/new**: Create email template.
- **/(dashboard)/templates/emails/[id]**: Edit email template.
- **/(dashboard)/templates/auth-emails**: Auth email templates.
- **/(dashboard)/templates/auth-emails/new**: Create auth email template.
- **/(dashboard)/templates/auth-emails/[id]**: Edit auth email template.
- **/(dashboard)/audit**: Audit log viewer and export.

### Participant
- **/(participant)/my**: Participant dashboard.
- **/(participant)/my/certificates**: My certificates list.
- **/(participant)/my/certificates/[id]**: My certificate detail.
- **/(participant)/my/profile**: Profile page (update email).

### Public
- **/**: Default landing page.
- **/verify**: Certificate verification search.
- **/faq**: Frequently Asked Questions.
- **/view/[id]**: Public certificate viewer.

## Route Handlers (Non-API endpoints)

- **GET /auth/confirm**: Query param `token`. Confirms email/account activation via `confirmEmail`, redirects to `/login?confirmed=true` or `/login?error=Confirmation+failed`.
- **GET /auth/callback**: Query param `token`. Same behavior as `/auth/confirm` (authentication callback).

## Workflow Endpoints (.well-known)

- **/.well-known/workflow/v1/flow**: Methods GET, POST, HEAD, OPTIONS. Workflow runtime entrypoint (generated file).
- **/.well-known/workflow/v1/step**: Methods POST, HEAD. Workflow step execution entrypoint (generated file).
- **/.well-known/workflow/v1/webhook/[token]**: Methods GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS. Resumes a paused workflow using the token extracted from the path.

## API Routes (/api)

### GET
- **/api/workflow-status**: Get the status of a workflow run.
  - **Auth**: None
  - **Request**: Query `runId` (required)
  - **Response**: `{"status": "completed"|"failed"|"pending", "result"?, "error"?}`
  - **Errors**: 400 missing runId, 404 run not found
- **/api/verify/[number]**: Verify a certificate by number.
  - **Auth**: None (public, cached)
  - **Request**: Path param `number`
  - **Response**: `{"valid": bool, "certificate_number", "issued_date", "valid_until", "status": "active"|"revoked"|"expired", "recipient_name", "organization": {"name"} | null, "event_name"}`
  - **Headers**: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
  - **Errors**: 404 not found (cached 60s). Logs audit `certificate.viewed`.
- **/api/events/[id]/revoke-expired**: Count expired certificates for an event.
  - **Auth**: admin
  - **Request**: Path param `id`
  - **Response**: `{"expired": count}` (POST variant revokes)
  - **Errors**: 401, 500
- **/api/certificates/[id]/view-data**: View data of a certificate by ID (used by public viewer).
  - **Auth**: None
  - **Request**: Path param `id`
  - **Response**: `{"certificate", "template", "event", "qrDataUrl", "orgName"}`
  - **Errors**: 404 not found, 410 revoked
- **/api/certificates/[id]/pdf**: Get the PDF for a certificate.
  - **Auth**: Any authenticated session
  - **Request**: Path param `id`
  - **Response**: **PDF binary**, headers `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<cert_number>.pdf"`
  - **Errors**: 401, 404
- **/api/certificates/[id]/download**: Download a certificate PDF.
  - **Auth**: admin/staff OR the recipient (matching email)
  - **Request**: Path param `id`
  - **Response**: **PDF binary**, headers `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<cert_number>.pdf"`
  - **Errors**: 401, 403 forbidden, 404, 410 revoked or expired
- **/api/health**: Render the admin master-reset HTML form (no JSON).
  - **Auth**: None
  - **Response**: HTML form posting to POST `/api/health`

### POST
- **/api/events/[id]/bulk-issue**: Bulk-issue certificates for an event.
  - **Auth**: admin, staff
  - **Request**: Path param `id`; body `{"attendeeIds": string[], "sendEmail"?: boolean}`
  - **Response**: Result of `issueCertificatesWorkflow`
  - **Errors**: 401, 403, 400 empty attendeeIds, 500
- **/api/events/[id]/reissue**: Re-issue certificates for selected attendees.
  - **Auth**: admin
  - **Request**: Path param `id`; body `{"attendeeIds": string[]}`
  - **Response**: Result of `reissueCertificatesForSelected`
  - **Errors**: 401, 403, 400 empty attendeeIds, 500
- **/api/events/[id]/revoke-expired**: Revoke expired certificates for an event.
  - **Auth**: admin
  - **Request**: Path param `id`; no body
  - **Response**: Result of `revokeExpiredForEvent`
  - **Errors**: 401, 403, 500
- **/api/certificates/[id]/save-pdf**: Save a rendered PDF to certificate metadata.
  - **Auth**: Any session; participant limited to own certificate
  - **Request**: Path param `id`; body `{"pdf_base64": string}`
  - **Response**: `{"success": true}`
  - **Errors**: 401, 403, 404, 400 missing `pdf_base64`
- **/api/certificates/expire**: Auto-revoke expired certificates and send expiry notifications.
  - **Auth**: admin
  - **Request**: None (no body)
  - **Response**: `{"revoked": count, "expiringCount": count, "error": null}`
  - **Errors**: 401

### DELETE
- **/api/storage/cleanup**: Remove orphaned files from the `certificates` storage bucket.
  - **Auth**: admin
  - **Request**: None
  - **Response**: `{"removed": count, "checked": count}`
  - **Errors**: 401, 500

## Form Submissions

- **POST /api/health**: Admin master-reset form.
  - **Request**: FormData fields `email`, `password`
  - **Behavior**: Compares to `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` env vars; on success re-seeds admin/staff/participant users and clears the session.
  - **Response**: HTML page (not JSON) with result of reset.

## Server Actions (Candidate API Endpoints)

### Auth (`auth.actions.ts`)
- **loginAction** — POST /api/auth/login — `{email, password}` — none — Authenticate and set session.
- **register** — POST /api/auth/register — `{name, email, password, confirmPassword}` — none — Register invited attendee, send confirmation email.
- **logout** — POST /api/auth/logout — none — session — Clear session, redirect to /login.
- **forgotPassword** — POST /api/auth/forgot-password — `{email}` — none — Send password reset email.
- **requestPasswordChange** — POST /api/auth/password-change-request — none — session — Send reset email to current user.
- **updatePassword** — POST /api/auth/update-password — `{password}` — session — Update password, invalidate refresh tokens.
- **updateEmail** — POST /api/auth/update-email — `{email}` — session — Update current user's email.
- **confirmEmail** — GET/POST /api/auth/confirm — `token` — none — Confirm email via token.
- **resetPassword** — POST /api/auth/reset-password — `{token, password}` — none — Reset password via reset token.
- **getCurrentUser** — GET /api/auth/me — none — session — Return current user profile.

### Users (`user.actions.ts`)
- **listUsersAction** — GET /api/users — none — admin — List all users with roles.
- **setUserRoleAction** — PATCH /api/users/[id]/role — `{userId, role}` — admin — Change user role (not self / main admin).
- **banUserAction** — POST /api/users/[id]/ban — `{userId}` — admin — Ban a user.
- **unbanUserAction** — POST /api/users/[id]/unban — `{userId}` — admin — Unban a user.
- **deleteUserAction** — DELETE /api/users/[id] — `{userId}` — admin — Delete a user.

### Attendees (`attendee.actions.ts`)
- **getAttendeesAction** — GET /api/events/[id]/attendees — `{eventId}` — session — List attendees for an event.
- **addAttendeeAction** — POST /api/events/[id]/attendees — `{event_id, organization_id, name, email, file_path?, mode?, file_data?, file_name?, file_type?}` — admin, staff — Add a single attendee.
- **updateAttendeeAction** — PATCH /api/attendees/[id] — `{id, name?, email?, attended?, completed?, metadata?}` — admin, staff — Update an attendee.
- **removeAttendeeAction** — DELETE /api/attendees/[id] — `{id}` — admin, staff — Remove an attendee.
- **removeAttendeeWithCertAction** — DELETE /api/attendees/[id]/with-cert — `{id}` — admin — Remove attendee and issued certificate.
- **getAttendeeDeletePreviewAction** — GET /api/attendees/[id]/delete-preview — `{id}` — admin — Preview what deletion affects.
- **getAttendeeFileDataAction** — GET /api/attendees/[id]/file-data — `{id}` — admin, staff — Get attendee file data.
- **bulkAddAttendeesAction** — POST /api/events/[id]/attendees/bulk — `{event_id, organization_id, attendees: [{name, email, metadata?}]}` — admin, staff — Bulk add attendees.
- **issueCertificatesForCompletedAction** — POST /api/events/[id]/issue-completed — `{eventId, options?: {send_email?, attendeeIds?}}` — admin, staff — Issue certificates for completed attendees.
- **revokeExpiredForEventAction** — POST /api/events/[id]/revoke-expired — `{eventId}` — admin — Revoke expired certificates for an event.
- **reissueCertificatesForSelectedAction** — POST /api/events/[id]/reissue — `{eventId, attendeeIds}` — admin — Re-issue certificates for selected attendees.

### Events (`event.actions.ts`)
- **getEventsAction** — GET /api/events — `{organizationId}` — admin, staff — List events.
- **getEventsPaginatedAction** — GET /api/events?page — `{organizationId, options: {search?, statuses?, limit, offset}}` — admin, staff — Paginated, filtered events.
- **getEventAction** — GET /api/events/[id] — `{id}` — admin, staff, participant — Get event by id.
- **getEventWithStatsAction** — GET /api/events/[id]/stats — `{id}` — admin, staff — Get event with statistics.
- **createEventAction** — POST /api/events — `{organization_id, name, description?, event_date?, location?, organizer?, certificate_title?, certificate_number_pattern?, valid_until?, template_id?, email_template_id?}` — admin, staff — Create an event.
- **updateEventAction** — PATCH /api/events/[id] — `{id, data: {name?, description?, event_date?, location?, organizer?, certificate_title?, certificate_number_pattern?, valid_until?, status?, template_id?, email_template_id?}}` — admin, staff — Update an event.
- **deleteEventAction** — DELETE /api/events/[id] — `{id}` — admin — Delete an event.
- **cloneTemplateForEventAction** — POST /api/events/[id]/clone-template — `{sourceTemplateId, eventId, eventName}` — admin, staff — Clone a certificate template for an event.
- **cloneEmailTemplateForEventAction** — POST /api/events/[id]/clone-email-template — `{sourceTemplateId, eventId, eventName}` — admin, staff — Clone an email template for an event.
- **issueEventCertificateAction** — POST /api/events/[id]/certificates — `{event_id, organization_id, recipient_name, recipient_email, send_email?}` — admin, staff — Issue a certificate for an event.
- **bulkIssueEventCertificatesAction** — POST /api/events/[id]/certificates/bulk — `{event_id, organization_id, recipients: [{name, email}], send_email?}` — admin, staff — Bulk-issue event certificates.

### Certificates (`certificate.actions.ts`)
- **issueCertificateAction** — POST /api/certificates — `{organization_id, template_id?, recipient_name, recipient_email, expires_at?, file_path?, metadata?, send_email?}` — admin, staff — Issue a certificate.
- **uploadCertificateFileAction** — POST /api/certificates/upload — `{organizationId, certificateNumber, fileBase64, fileName}` — admin, staff — Upload a certificate file to storage.
- **getCertificatesAction** — GET /api/certificates — `{organizationId}` — admin, staff — List certificates.
- **getCertificatesWithEventAction** — GET /api/certificates?include=event — `{organizationId}` — admin, staff — List certificates with event info.
- **getCertificateAction** — GET /api/certificates/[id] — `{id}` — admin, staff, participant (own only) — Get a certificate.
- **revokeCertificateAction** — POST /api/certificates/[id]/revoke — `{id, reason}` — admin — Revoke a certificate.
- **deleteCertificateAction** — DELETE /api/certificates/[id] — `{id}` — admin — Delete a certificate.
- **sendCertificateEmailAction** — POST /api/certificates/[id]/email — `{certificateId}` — admin, staff — Send the certificate email.
- **getEmailLogsAction** — GET /api/certificates/[id]/email-logs — `{certificateId}` — admin, staff — Get email logs for a certificate.
- **getMyCertificatesAction** — GET /api/me/certificates — none — session — List current user's certificates.
- **getMyCertificateAction** — GET /api/me/certificates/[id] — `{id}` — session — Get one of current user's certificates.
- **getCertificateQrCodeAction** — GET /api/certificates/qr — `{certificateNumber}` — admin, staff, participant — Generate QR code data URL.
- **getSessionRoleAction** — GET /api/auth/role — none — session — Return current session role.
- **getAllEmailLogsAction** — GET /api/email-logs — `{limit?, offset?}` — admin — List all email logs.

### Templates (`template.actions.ts`)
- **getCurrentRoleAction** — GET /api/auth/role — none — session — Return current role.
- **getTemplatesAction** — GET /api/templates — `{organizationId}` — admin, staff — List all templates with lock state.
- **getCertificateTemplatesAction** — GET /api/templates/certificates — `{organizationId}` — admin, staff — List certificate templates.
- **getCertificateTemplatesWithLockStateAction** — GET /api/templates/certificates?lockState — `{organizationId}` — admin, staff — List certificate templates with lock state.
- **getEmailTemplatesAction** — GET /api/templates/emails — `{organizationId}` — admin, staff — List email templates.
- **getEmailTemplatesWithLockStateAction** — GET /api/templates/emails?lockState — `{organizationId}` — admin, staff — List email templates with lock state.
- **getAuthTemplatesAction** — GET /api/templates/auth — `{organizationId}` — admin, staff — List auth templates.
- **getTemplateAction** — GET /api/templates/[id] — `{id}` — admin, staff, participant — Get a template.
- **getEmailTemplateAction** — GET /api/templates/emails/[id] — `{id}` — admin, staff, participant — Get an email template.
- **getAuthTemplateByProcessAction** — GET /api/templates/auth/[process] — `{authProcess}` — admin, staff — Get auth template by process.
- **isTemplateLockedAction** — GET /api/templates/[id]/locked — `{id}` — admin, staff — Check template lock state.
- **isEmailTemplateLockedAction** — GET /api/templates/emails/[id]/locked — `{id}` — admin, staff — Check email template lock state.
- **createTemplateAction** — POST /api/templates — `{organization_id, name, description?, html_content, css_content?}` — admin, staff — Create a template.
- **createEmailTemplateAction** — POST /api/templates/emails — `{organization_id, name, description?, html_content, css_content?}` — admin, staff — Create an email template.
- **createAuthTemplateAction** — POST /api/templates/auth — `{organization_id, name, description?, html_content, css_content?, auth_process}` — admin, staff — Create an auth template.
- **updateTemplateAction** — PATCH /api/templates/[id] — `{id, data: {name?, description?, html_content?, css_content?, type?, auth_process?}}` — admin, staff — Update a template (blocked if locked).
- **deleteTemplateAction** — DELETE /api/templates/[id] — `{id}` — admin — Delete a template (blocked if locked).

### Dashboard (`dashboard.actions.ts`)
- **getDashboardStatsAction** — GET /api/dashboard/stats — `{organizationId}` — session — Dashboard statistics.
- **getRecentActivityAction** — GET /api/dashboard/activity — `{organizationId}` — session — Recent activity feed.

### Organizations (`organization.actions.ts`)
- **createOrganizationAction** — POST /api/organizations — none — none — Disabled in single-org mode.
- **getMyOrganizationsAction** — GET /api/organizations/me — none — admin, staff — List user's organizations.
- **getOrganizationMembersAction** — GET /api/organizations/[id]/members — `{organizationId}` — admin, staff — List organization members.
- **addMemberAction** — POST /api/organizations/[id]/members — `{organizationId, email, role}` — admin — Add a member.
- **removeMemberAction** — DELETE /api/organizations/[id]/members/[memberId] — `{organizationId, memberId}` — admin — Remove a member.

### Audit (`audit.actions.ts`)
- **getAuditLogsAction** — GET /api/audit-logs — `{filters?: {action?, userId?, entityType?, source?, fromDate?, toDate?, limit?, offset?}}` — admin — Query audit logs.
- **getEntityAuditLogsAction** — GET /api/audit-logs/entity — `{entityType, entityId}` — admin — Audit logs for an entity.
- **getUserAuditLogsAction** — GET /api/audit-logs/user — `{userId}` — admin — Audit logs for a user.
- **getAuditLogsForExportAction** — GET /api/audit-logs/export — `{filters?}` — admin — Audit logs for export.
- **deleteAuditLogsAction** — DELETE /api/audit-logs — `{ids: string[]}` — admin — Delete specific audit logs.
- **deleteAllAuditLogsAction** — DELETE /api/audit-logs/all — `{filters?}` — admin — Delete all matching audit logs.
- **getAuditLogsByIdsAction** — GET /api/audit-logs/by-ids — `{ids: string[]}` — admin — Fetch audit logs by ids.

### Demo (`demo.actions.ts`) — DEMO-mode only
- **setImpersonateUser** — POST /api/demo/impersonate — `{userId | null}` — DEMO only — Set/clear impersonation cookie.
- **getImpersonateUserId** — GET /api/demo/impersonate — none — DEMO only — Get impersonated user id.
- **isDemoMode** — GET /api/demo/mode — none — none — Whether demo mode is enabled.

## Client-Side fetch() Calls

| URL | Method | Body | Source component |
| --- | --- | --- | --- |
| /api/events/[id]/bulk-issue | POST | `{attendeeIds, sendEmail}` | `src/app/(dashboard)/events/[id]/components/attendees-tab.tsx` |
| /api/events/[id]/revoke-expired | GET | — | `src/app/(dashboard)/events/[id]/components/attendees-tab.tsx` |
| /api/events/[id]/revoke-expired | POST | — | `src/app/(dashboard)/events/[id]/components/attendees-tab.tsx` |
| /api/events/[id]/reissue | POST | `{attendeeIds}` | `src/app/(dashboard)/events/[id]/components/attendees-tab.tsx` |
| /api/certificates/expire | POST | — | `src/features/certificates/components/certificates-list.tsx` |
| /api/verify/[number] | GET | — | `src/features/certificates/components/verify-search.tsx` |

## Recommendations for API Extraction

1. **Start with read-only CRUD**: auth (`GET /api/auth/me`, login/logout), events, certificates, templates, users, audit logs. These map 1:1 to existing server actions with minimal change.
2. **Extract auth/session first**: all actions depend on `requireRole` / `getCurrentSession`; move session management (cookies) behind the API and pass a token/session header.
3. **Binary responses need special handling**: `/api/certificates/[id]/pdf` and `/download` return raw PDF bytes — keep as dedicated streaming endpoints, don't base64 them.
4. **The /api/health POST is a form-based admin reset** — not a health check. Either move to a proper JSON `POST /api/admin/reset` or exclude from extraction.
5. **Leave the .well-known workflow runtime endpoints server-side** (`/flow`, `/step`, `/webhook/[token]`) — they're generated framework internals, not app domain logic.
6. **File uploads**: `uploadCertificateFileAction` and attendee `file_data` pass base64 — convert to multipart upload endpoints when extracting.
7. **Workflow-backed issue/reissue**: `/api/events/[id]/bulk-issue` runs a workflow — decide whether the API exposes the workflow async status (`/api/workflow-status`) or blocks on completion.
8. **Remove or gate demo actions** (`impersonate`, demo mode) — they're environment-flag-gated and shouldn't ship in the public API.
