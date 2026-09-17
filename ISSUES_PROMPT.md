# Issue Resolution Prompt

## Context
Project: e-cert (Next.js 16.2.10, React 19, TypeScript, TailwindCSS, pnpm)
Location: `src/features/events/components/attendees-manager.tsx`

---

## Issue 1: issue-row-button table refresh

### Current Behavior
When user clicks "Issue Certificate" button (id=`issue-row-button`), the `handleIssueSingle` function:
1. Calls `certificatesApi.issueFromEvent()` with `send_email: true`
2. On success: shows toast message and calls `void fetchPage(page, pageSize, debouncedSearch, filter)` (line 464)
3. On error: displays error message

The `fetchPage` function refreshes the attendee table using current:
- `search` = `debouncedSearch` 
- `status` = `filter` (FilterStatus)
- `limit` = `pageSize`
- `offset` = `page * pageSize`

### Resolution
The refresh logic is already implemented. The `fetchPage` call should update the `attendees` state, causing the component to re-render with updated attendee data (including the new `certificate_id`), which automatically hides/updates the "Issue Certificate" button via the `!a.certificate_id` condition on line 702-717.

**If button still doesn't refresh without manual page reload**, investigate:
- API response timing for `certificate_id` update
- Ensure `fetchPage` dependencies `[eventId, page, pageSize, debouncedSearch, filter]` are correct (line 150)
- Check if the external cert API returns updated attendee data with `certificate_id`

### Code References
- `handleIssueSingle` function: line 444-471
- `fetchPage` definition: line 98-114
- Button rendering with `certificate_id` check: line 702-717
- State updates: `setAttendees` on line 138, 171

---

## Issue 2: Email not sending

### Current Behavior
The `handleIssueSingle` passes `send_email: true` to the API (line 458). The `handleResendEmail` function calls `certificatesApi.sendEmail(attendee.certificate_id)` (line 480).

However, the API routes are proxied to an external service:
- `src/app/api/events/[...path]/route.ts` proxies to `https://cert-api.lyceumalabang.edu.ph`
- Email functionality exists in the backend service at the external cert API

### Resolution
**No code change required for now** - the email gap is in the backend service (external cert API), not in this frontend code. The frontend correctly passes `send_email: true` and calls the `sendEmail` API function. Email functionality needs to be addressed on the backend cert API service.

### Code References
- `issueFromEvent` API call: line 453-459
- `sendEmail` API function: `src/lib/api/certificates.ts:130-131`
- API proxy route: `src/app/api/events/[...path]/route.ts:3-9`

---

## Summary
- **issue-row-button**: Refresh logic already works via `fetchPage` call; verify API response includes updated `certificate_id` if button doesn't update
- **email sending**: Frontend code is correct; backend service gap requires no frontend changes at this time