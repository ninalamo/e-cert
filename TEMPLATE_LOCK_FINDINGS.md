# Email Template Locking Bug — Findings

## Problem

Email templates are **not locked** when referenced by an activated (or archived) event.
Certificate templates ARE locked correctly. This means users can edit/delete email templates
that are in use by live events, potentially breaking certificate notification emails.

## Root Cause

Three specific gaps in the lock logic:

### 1. `getTemplatesWithLockState()` ignores `email_template_id`

**File:** `src/features/templates/server/template.service.ts` (lines 46-48)

```typescript
const lockedIds = new Set(
  linkedEvents.map((e) => e.template_id).filter((id): id is string => !!id)
);
```

Only collects `e.template_id` (certificate template IDs). Never checks `e.email_template_id`,
so email templates are never marked as `locked: true` in the table listing.

### 2. `updateTemplateAction()` uses certificate-only lock check

**File:** `src/features/templates/server/template.actions.ts` (line 81)

```typescript
if (await templateService.isTemplateLocked(id)) {
```

Calls `isTemplateLocked()` which only queries `findByTemplateId()` (certificate).
When an email template is submitted for update, it checks the wrong relationship.

### 3. `deleteTemplateAction()` same issue

**File:** `src/features/templates/server/template.actions.ts` (line 93)

Same as above — only checks certificate template locks.

## What Already Works

- `isEmailTemplateLocked()` service function exists and is correct
- `isEmailTemplateLockedAction` exists and is correct
- The email edit form UI calls `isEmailTemplateLockedAction` on load to disable the form visually
- But the server-side update/delete actions bypass this by using the certificate lock check

## Database Schema

Both template types live in `certificate_templates`, differentiated by `type` column:
- `type = 'certificate'` — certificate templates
- `type = 'email'` — email templates

Events reference both via:
- `template_id` → certificate template
- `email_template_id` → email template

## Fix Summary

1. `getTemplatesWithLockState`: also collect `email_template_id` into `lockedIds`
2. `updateTemplateAction`: detect template type, call `isEmailTemplateLocked` for email templates
3. `deleteTemplateAction`: same type detection + correct lock check
4. Add `getCertificateTemplatesWithLockState()` and `getEmailTemplatesWithLockState()` for backend-filtered queries
5. Restructure routes: `/templates/certificates` and `/templates/emails` as separate list pages
