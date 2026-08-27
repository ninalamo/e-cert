# LOA e-cert — User Activity Context (Certificates & Events on the Users Page)
## Product Assembly Component Specification

**Version:** 0.3
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Users administration / Cert API dependency
**Audience:** Engineers, AI Development Agents

> **Related:** `specs/auth/user-revocation.md` (revocation mechanics — already live),
> `assemblies/loa-cert-platform/api-endpoints.md` (endpoint catalog),
> `src/app/(dashboard)/users/page.tsx` (host page).
> Revocation itself is **already fully in-e-cert** via `/auth-api/v1/users/{id}/status`; this spec adds
> *context* so admins see what a user holds before revoking.

---

# 1. Purpose

It answers:

> **"Does this person hold certificates or attended events — and can an admin see that (and revoke
> access) without ever opening the Auth Platform admin panel?"**

The Users page today lists identity + status only. This spec defines a two-API helper/service
(auth-api for identity/status, cert-api for activity) and the small cert-api addition required to
show attendance without N+1 queries.

---

# 2. Data model (verified against `loa_cert`, 2026-08-24)

| Table | Join-relevant columns | Notes |
|-------|----------------------|-------|
| `event_attendees` | `email`, `event_id`, `attended`, `completed`, `attended_at`, `completed_at`, `certificate_id`, `certificate_number` | One row **per attendee per event**; keyed by **email**, not auth UUID |
| `certificates` | `recipient_email`, `event_id`, `revoked_at`, `certificate_number` | Standalone certs may have NULL `event_id` |

**Mapping rule:** auth `users.email` ↔ `event_attendees.email` / `certificates.recipient_email`.
There is no FK to `loa_auth.users` — email is the only correlation key.
Emails must be compared **case-insensitively** (normalize both sides to lower-case in the service;
do not rely on DB collation differences between local and production).

### 2.1 "Is an attendee" — two interpretations (verified 2026-08-24)

`event_attendees` carries per-event flags `attended` and `completed`. Which one the badge means
changes what Phase 1 can show:

| Interpretation | Meaning | Phase 1 (no backend change) | Phase 2 (`attendees/lookup`) |
|----------------|---------|------------------------------|------------------------------|
| A. Involved in events | Holds ≥1 certificate ⇒ appeared on some roster | ✅ implied by certificate count | ✅ |
| B. Actual attendance | `attended = true` on ≥1 event, **including cert-less attendees** | ❌ invisible without certificates | ✅ `events[].attended` |

Phase 1 badges therefore answer A only; interpretation B arrives with §3.3.

---

# 3. API surface (verified 2026-08-24)

## 3.1 Already available — certificates by person

```
GET {CERT_API}/api/v1/certificates?recipient_email=<email>&limit=1
Authorization: Bearer <access token with claim admin:/api/v1/certificates>
```

- `CertificateController::index` filters `recipient_email` exactly; supports `status`
  (`active|revoked|expired`) and `event_id`; includes `event` + `template` relations.
- **Paginated**: `{ data: [...], meta: { limit, offset, total, has_more } }`, default `limit=25`,
  max 100. For badge counts, request `limit=1` and read `meta.total` — never count the array.
- Claim `admin:/api/v1/certificates` already present on `cert-admin` tokens (verified in claims dump);
  endpoint levels are ordinal (`read(1) < write(2) < admin(3)`), so an admin-level grant satisfies
  any lower requirement.
- Split counts need two parallel calls: `status=active` and `status=revoked` (each returning its
  own `meta.total`).
- **Verified `status=active` semantics** (source: `CertificateController::index`):
  `revoked_at IS NULL AND (expires_at IS NULL OR expires_at >= now())` — i.e. *not revoked and not
  expired*. This is the exact signal the revocation-decision rule in §5a needs.

## 3.2 Missing — attendance across events

Today only per-event listing exists:

```
GET {CERT_API}/api/v1/events/{eventId}/attendees?search=<email LIKE within ONE event>
```

Cross-event "which events has this email attended?" would require fetching all events then querying
attendees per event (**N+1 — rejected**).

### 3.3 Required cert-api addition (Phase 2)

New aggregate lookup in the Cert Platform:

```
GET {CERT_API}/api/v1/attendees/lookup?email=<email>

200 →
{
  "data": {
    "email": "<normalized>",
    "events": [
      {
        "id": "<uuid>",
        "name": "...",
        "attended": true,
        "completed": false,
        "attended_at": null,
        "completed_at": "...",
        "has_certificate": true,
        "certificate_revoked": false
      }
    ],
    "totals": { "events": 3, "attended": 2, "certificates_active": 1, "certificates_revoked": 0 }
  }
}
```

Backend notes (single query set — no loops):

1. `EventAttendee::whereRaw('LOWER(email) = ?', [strtolower($email)])` eager-loaded with `event:id,name`.
   Empty email / no match → `data.events: []`, `totals` zeroed, still HTTP 200 (not 404).
2. **Catalog registration is mandatory, not cosmetic**: `EndpointPolicyMiddleware` rejects any
   request whose method+path has no `tenant_app_endpoints` entry with
   `403 {"reason":"no_catalog_entry"}` — **even for holders of admin-level claims**. Register the
   endpoint first, then grant.
3. Catalog entry: `GET /api/v1/attendees/lookup`, `required_level: read`; grant `read` to
   `cert-admin` (+ `cert-staff` if staff should view). Ordinal levels mean an existing
   `admin:/api/v1/attendees/lookup` claim would also satisfy it. Grants only take effect in
   **newly issued** tokens — log out/in after provisioning.

---

# 4. e-cert integration design

## 4.1 Service — `src/lib/api/user-activity.ts`

```ts
export interface UserActivitySummary {
  email: string;
  certificatesActive: number;
  certificatesRevoked: number;
  eventsAttended: number;
  eventsTotal: number;
  latestActivityAt: string | null;   // max(attended_at | completed_at | certificate issued_at)
}

export const userActivityApi = {
  summary(email: string): Promise<UserActivitySummary>,      // Phase 1: certificates only
  detail(email: string): Promise<UserActivityDetail>,        // Phase 2: + events array (adds lookup call)
};
```

- Runs the cert-api calls **in parallel** (`Promise.all`); auth-api is not consulted here — the page
  already owns identity/status via `usersAdminApi`.
- Phase 1 counting uses the `limit=1` + `meta.total` pattern (§3.1): two parallel requests per email
  (`status=active`, `status=revoked`).
- Each cert-api failure degrades independently: summary fields default to `0/null`, never block the
  user row from rendering (mirror the `.catch(() => …)` tolerance used on the page today).
- Uses the shared `client.ts` fetch wrapper (same-origin `/api/v1/*` rewrite → CERT_API_TARGET),
  so logging + error-body tolerance come free.
- Per-email results are memoized for the session (Map keyed by lower-cased email) to avoid repeat
  fetches on re-renders; a status change invalidates only that user's entry.

## 4.2 UI — `(dashboard)/users/page.tsx`

- **Row badge strip** (between email and status pill): compact counts, e.g.
  award-icon `1` + calendar-check icon `2/3` — lucide icons, no emoji. Hidden until loaded;
  skeleton shimmer placeholder while fetching.
- **Lazy load trigger**: `IntersectionObserver` on each row — summary fetch fires once when the row
  first becomes visible (Phase 1 has no expansion affordance, so visibility is the trigger).
  Phase 2 adds click-to-expand detail, which reuses the same cached data.
- **Expandable detail (Phase 2)**: clicking a row toggles an inline panel listing the `events`
  array (event name, attended/completed ticks, certificate status) — read-only.
- Self-row shows the same context; actions stay hidden per existing rules.
- `canViewUsers()` gates everything (already enforced by the page shell).

> **Security note:** exposing cert-side records by arbitrary email query is acceptable here because
> access requires tenant-admin claims (`users.view` + cert endpoint grants) and results are scoped to
> the caller's tenant data. Do not relax this into any unauthenticated or participant-scoped route.

---

# 5. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Correlation key | Email (only key shared across platforms); compare lower-cased on both sides |
| 2 | Cross-event attendance | New `GET /attendees/lookup` endpoint — per-event fan-out rejected (N+1) |
| 3 | Load strategy | Lazy per-row, never bulk-eager for the whole list |
| 4 | Failure isolation | cert-api outage degrades to "no activity shown"; identity/status unaffected |
| 5 | Scope boundary | Read-only context. Revocation continues to use existing auth-api PATCH — no new write paths |

## 5a. Revocation decision support (verified 2026-08-24)

The operating rule this context enables: **"safe to revoke when active certificates = 0."**

- Active count source: §3.1 `status=active` `meta.total` (Phase 1) / `totals.certificates_active`
  (Phase 2). The badge is advisory — the Disable action itself stays manual and confirm-gated.
- **Boundary**: disabling login (`PATCH /auth-api/v1/users/{id}/status`) revokes *access* only.
  Existing certificates remain publicly verifiable (`/verify/{number}` is a public route); revoking
  certificates is a separate Certificates/Events-page action. Never conflate the two in copy —
  the confirm dialog already says "revokes sessions, never deletes".
- An attendee with zero certificates may still be enrolled in upcoming events; Phase 2's
  interpretation-B flag (§2.1) surfaces that risk before an admin pulls access.

---

# 6. Phases & acceptance criteria

## Phase 1 — certificates-only context (no backend change)

1. Row badge shows active/revoked certificate counts sourced from `meta.total` of two
   `GET /certificates?recipient_email=&limit=1&status=…` calls (lower-cased email).
2. Requests are lazy (row-visible via IntersectionObserver), fired once per user, memoized for the
   session; a status toggle invalidates that user's cached entry.
3. cert-api failure renders zeroed badge + tooltip, never an error banner or broken row.

## Phase 2 — attendance context (requires cert-api §3.3)

1. `attendees/lookup` deployed, catalogued, granted to `cert-admin`; refreshed cert-admin token
   carries `admin:/api/v1/attendees/lookup`.
2. Detail panel lists every event the email appears on with attended/completed/certificate state.
3. Totals badge switches to `userActivityApi.detail()` source.
4. Unknown email → empty state inside panel ("No cert-side records"), HTTP 200 path.

## Out of scope

- Any write from the activity panel (revoke certificate etc.) — belongs to Events/Certificates pages.
- Group/permission management UI (stays in Auth Platform).
- Cross-tenant lookups — service always operates within caller's tenant-scoped cert data.

---

# 7. Bootstrap runbook (one-time per environment, Phase 2)

```text
# Cert Platform admin (or installer SQL update):
1. Add endpoint row  GET /api/v1/attendees/lookup  (level: read)     → tenant_app_endpoints
2. Grant 'read' on it to cert-admin (and optionally cert-staff)       → tenant_endpoint_grants
3. Affected admins log out/in once                                    → fresh claims
```

Local dev: extend `cpanel-auth-db-install.sql` catalog+grants **and**
`LocalCertReadinessSeeder`/`database.sql` equivalents so fresh installs include it.

---

# 8. Doc control

| Version | Date | Change |
|---------|------|--------|
| 0.1 | 2026-08-24 | Initial draft after investigation: verified email-keyed schema, existing `recipient_email` filter, missing cross-event lookup; defined two-phase plan + service/UI shape. |
| 0.2 | 2026-08-24 | Review pass against cert-app source: pagination correction (`meta.total` + `limit=1` count pattern), catalog-first enforcement warning (`no_catalog_entry` 403 even for admins), level-ordinal note, concrete lazy-load trigger (IntersectionObserver), per-email memoization + invalidation, security note on email-scoped lookups, response envelope aligned to `{data}` convention. |
| 0.3 | 2026-08-24 | Verified `status=active` semantics (not revoked AND not expired) added to §3.1; §2.1 attendee interpretations A/B with phase availability; new §5a revocation decision support — "revoke when active = 0" rule, login-disable vs certificate-revocation boundary, upcoming-event risk surfaced by Phase 2 interpretation B. |
