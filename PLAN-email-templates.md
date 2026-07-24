# Email Template Editor Implementation Plan

## Overview
Add customizable email templates to the e-cert system, allowing each event to have its own optional email template with a one-to-one mapping.

---

## Progress Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Database & Types |
| 2 | ✅ Complete | Backend Services |
| 3 | ✅ Complete | Email Template Editor |
| 4 | ⏳ Pending | Event Forms |
| 5 | ⏳ Pending | Email Service |
| 6 | ⏳ Pending | Templates Table |
| 7 | ⏳ Pending | Testing & Polish |

**Overall Progress: 3/7 phases complete (43%)**

---

## Migration Notes

### Existing Data Handling
| Table | Column | Rule |
|-------|--------|------|
| `certificate_templates` | `type` | All existing rows → `'certificate'` (null treated as certificate) |
| `events` | `email_template_id` | All existing rows → `NULL` (null treated as system default) |

### System Default Behavior
When `email_template_id` is `NULL`, the email service uses the hardcoded template from `email-template.ts` (`certificateEmailHtml()`). No migration needed for existing events.

---

## Phase 1: Database & Types

### Schema Changes
- [x] Add `type` column to `certificate_templates` table (`'certificate' | 'email'`)
- [x] Add `email_template_id` column to `events` table (FK to `certificate_templates`)
- [x] Add indexes for `type` and `email_template_id`
- [x] Update `src/types/template.ts` - add `type` field
- [x] Update `src/types/event.ts` - add `email_template_id` field

### Backfill Rules (Existing Data)
- [x] All existing `certificate_templates.type` = `'certificate'` (null treated as certificate)
- [x] All existing `events.email_template_id` = `NULL` (null treated as system default)
- [x] Email service falls back to system default template when `email_template_id` is null

---

## Phase 2: Backend Services

### Template Repository
- [x] Add `findByOrganizationIdAndType()` method to `template.repository.ts`
- [x] Update `create()` to include `type` field

### Template Service
- [x] Add `getEmailTemplates(organizationId)` function
- [x] Add `getCertificateTemplates(organizationId)` function
- [x] Add `getEmailTemplate(id)` function
- [x] Add `createEmailTemplate(data)` function
- [x] Update `createTemplate()` to accept `type` parameter
- [x] Add `isEmailTemplateLocked()` function

### Template Actions
- [x] Add `getEmailTemplatesAction(organizationId)`
- [x] Add `getCertificateTemplatesAction(organizationId)`
- [x] Add `createEmailTemplateAction(data)`
- [x] Add `getEmailTemplateAction(id)`
- [x] Add `isEmailTemplateLockedAction(id)`

### Event Repository
- [x] Add `findByEmailTemplateId()` to event repository

### Event Service
- [x] Add `cloneEmailTemplateForEvent()` function
- [x] Update `createEvent()` to accept `email_template_id`
- [x] Update `updateEvent()` to accept `email_template_id`
- [x] Update `getEventWithStats()` to fetch email template

### Event Actions
- [x] Update `createEventAction()` to accept `email_template_id`
- [x] Update `updateEventAction()` to accept `email_template_id`
- [x] Add `cloneEmailTemplateForEventAction()`

---

## Phase 3: Email Template Editor

### New Components
- [x] Create `src/features/templates/components/email-template-editor.tsx`
- [x] Create `src/features/templates/components/email-placeholder-field.ts`

### Email Template Editor Features
- [x] Rich text editor (TipTap)
- [x] Email-safe CSS editor (inline styles only)
- [x] Live preview in iframe (simulating email client)
- [x] Default email template pre-filled
- [x] Placeholder insertion toolbar
- [x] Email-specific placeholders:
  - `{{recipient_name}}`
  - `{{certificate_number}}`
  - `{{issued_date}}`
  - `{{download_url}}`
  - `{{verify_url}}`
  - `{{org_name}}`

### Template Form Updates
- [x] Add type toggle at top of form (Certificate / Email)
- [x] Conditionally render canvas editor or email editor based on type
- [x] Update form submission to include `type`
- [x] Update edit-template-form.tsx to pass `type` field

---

## Phase 4: Event Forms

### New Event Form (`src/app/(dashboard)/events/new/new-event-form.tsx`)
- [ ] Add `emailTemplates` to props
- [ ] Add `selectedEmailTemplate` state
- [ ] Add email template dropdown (optional, defaults to system template)
- [ ] Update `handleSubmit` to pass `email_template_id`

### Event Detail Page (`src/app/(dashboard)/events/[id]/event-detail.tsx`)
- [ ] Add `initialEmailTemplates` to props
- [ ] Fetch email templates on mount
- [ ] Pass email templates to `TemplateCard`

### Template Card (`src/app/(dashboard)/events/[id]/components/template-card.tsx`)
- [ ] Add `emailTemplates` prop
- [ ] Add `currentEmailTemplate` prop
- [ ] Add `onEmailTemplateUpdated` callback
- [ ] Add email template section below certificate template
- [ ] Add email template dropdown
- [ ] Add "Assign Email Template" button
- [ ] Add clone functionality for email templates

### Server Pages
- [ ] Update `src/app/(dashboard)/events/new/page.tsx` to fetch email templates
- [ ] Update `src/app/(dashboard)/events/[id]/page.tsx` to fetch email templates

---

## Phase 5: Email Service

### Update `src/features/certificates/server/certificate-email.service.ts`
- [ ] Fetch event's `email_template_id` when sending email
- [ ] If `email_template_id` is NULL → use system default (`certificateEmailHtml()`)
- [ ] If `email_template_id` has value → load custom template from DB
- [ ] Add `renderEmailTemplate()` function for placeholder replacement

### Update `src/features/certificates/server/email-template.ts`
- [ ] Add `renderEmailTemplate()` helper function
- [ ] Keep existing `certificateEmailHtml()` as fallback (used when `email_template_id` is null)

---

## Phase 6: Templates Table

### Update `src/features/templates/components/templates-table.tsx`
- [ ] Add type filter options (All, Certificates, Emails)
- [ ] Update filtering logic to filter by `type`
- [ ] Add type badge in template rows
- [ ] Update "New Template" button to show type selection

### Update `src/app/(dashboard)/templates/page.tsx`
- [ ] Fetch templates with type information
- [ ] Pass to `TemplatesTable`

### New Pages
- [ ] Create `src/app/(dashboard)/templates/email/new/page.tsx`
- [ ] Create `src/app/(dashboard)/templates/email/[id]/page.tsx`

---

## Phase 7: Testing & Polish

- [ ] Test email template creation flow
- [ ] Test email template editing flow
- [ ] Test email template deletion flow
- [ ] Test event creation with email template
- [ ] Test event editing with email template
- [ ] Test email sending with custom template
- [ ] Test email sending with default template
- [ ] Test clone functionality
- [ ] Test template locking for email templates
- [ ] Test type filtering in templates table
- [ ] Verify email preview renders correctly
- [ ] Verify email-safe HTML output

---

## Key Design Decisions

1. **Reuse `certificate_templates` table** with `type` column - simpler schema, less code duplication
2. **Email templates use table-based HTML** with inline styles for email client compatibility
3. **Default system email template** if no custom template is assigned
4. **Clone functionality** same as certificate templates
5. **One-to-one mapping** per event - each event can have one email template

### Backfill Strategy
- **`certificate_templates.type`**: All existing rows get `type = 'certificate'` (null treated as certificate)
- **`events.email_template_id`**: All existing rows stay `NULL` (null treated as system default)
- **Email sending**: When `email_template_id` is null, use hardcoded `certificateEmailHtml()` from `email-template.ts`

---

## Email Template Placeholders

| Placeholder | Description | Example Value |
|-------------|-------------|---------------|
| `{{recipient_name}}` | Recipient's full name | Juan Dela Cruz |
| `{{certificate_number}}` | Certificate number | CERT-0001 |
| `{{issued_date}}` | Date of issue | 7/24/2026 |
| `{{download_url}}` | Link to view certificate | https://example.com/view/abc123 |
| `{{verify_url}}` | Link to verify certificate | https://example.com/verify?number=CERT-0001 |
| `{{org_name}}` | Organization name | Lyceum Of Alabang |

---

## File Changes Summary

### New Files
- `src/features/templates/components/email-template-editor.tsx` ✅
- `src/features/templates/components/email-placeholder-field.ts` ✅

### Modified Files (Completed)
- `supabase/schema.sql` ✅
- `src/types/template.ts` ✅
- `src/types/event.ts` ✅
- `src/features/templates/server/template.repository.ts` ✅
- `src/features/templates/server/template.service.ts` ✅
- `src/features/templates/server/template.actions.ts` ✅
- `src/features/templates/components/template-form.tsx` ✅
- `src/features/templates/components/templates-table.tsx` ⏳ (Phase 6)
- `src/features/events/server/event.repository.ts` ✅
- `src/features/events/server/event.service.ts` ✅
- `src/features/events/server/event.actions.ts` ✅
- `src/features/certificates/server/certificate-email.service.ts` ⏳ (Phase 5)
- `src/features/certificates/server/email-template.ts` ⏳ (Phase 5)
- `src/app/(dashboard)/events/new/new-event-form.tsx` ⏳ (Phase 4)
- `src/app/(dashboard)/events/new/page.tsx` ⏳ (Phase 4)
- `src/app/(dashboard)/events/[id]/event-detail.tsx` ⏳ (Phase 4)
- `src/app/(dashboard)/events/[id]/page.tsx` ⏳ (Phase 4)
- `src/app/(dashboard)/events/[id]/components/template-card.tsx` ⏳ (Phase 4)
- `src/app/(dashboard)/templates/page.tsx` ⏳ (Phase 6)
- `src/app/(dashboard)/templates/[id]/edit-template-form.tsx` ✅
