# SESSION PROMPT — LOA e-cert Frontend Refactor

> Assembly-scoped session prompt for `specs/` and the e-cert frontend refactor. This complements (does not replace) the governing `legacy-e-cert-integration.md`.

## How to Use

1. **Starting a new session:** Paste the `## Startup Prompt` block below verbatim into the first message.
2. **Ending a session:** Update the `## Last Session Notes` section so the next session knows exactly where to pick up.
3. **Scope rule:** This prompt governs **e-cert frontend refactor only** (CSR, auth swap, data swap, API client, UI cleanup). Do not pull in Auth Platform or Cert Platform implementation tasks.

---

## Startup Prompt

Paste this block into the first message of a new session:

```
Read these files IN ORDER and report your understanding of where we left off:

1. specs/README.md                        - assembly overview, spec map, governing decisions (CSR approach)
2. specs/auth/README.md                   - auth & SSO integration overview
3. specs/auth/session-handling.md         - in-memory token store (v2.0, CSR)
4. specs/auth/jwt-verification.md         - client-side JWT parsing (v2.0)
5. specs/auth/sso-fragment.md             - SSO fragment handler (v2.0)
6. specs/auth/role-resolution.md          - role from JWT permissions (v2.0)
7. specs/auth/proxy.md                    - client-side route guard (v2.0, no server proxy)
8. specs/api-client/README.md             - Cert API typed HTTP client (v2.0)
9. specs/testing/README.md                - Playwright + JSON Server e2e strategy (v2.0)
10. specs/data-flow.md                    - service dependencies, security boundaries
11. specs/pages/README.md                 - pages to keep/remove
12. specs/components/README.md            - modules to keep/remove/adapt
13. specs/environment/README.md           - env contract (4 vars)
14. specs/deployment/README.md            - Vercel topology
15. specs/local-dev/README.md             - local dev workflow, JSON Server mock
16. SESSION-PROMPT.md                     - this file: "Last Session Notes" = where we stopped

Then:
- Summarize the spec status (all Final) and what's implemented vs pending
- List what's Done, In Progress, Backlog
- Identify the NEXT action item from "Last Session Notes"
- Do NOT write any code until the governing specs are Final
```

---

## Last Session Notes

### Date: 2026-08-06

### Completed
- **Governing retrofit spec aligned to CSR — `legacy-e-cert-integration.md` → v2.1** (authoritative in `loa-apache-server-apps/assemblies/loa-cert-platform/`, synced here per D7):
  - D8 superseded 2026-08-06 (CSR wins — matches `specs/` v2.0); §3 SPA architecture, §6 in-memory session + parse-only client JWT + route guard, §8 server actions deleted (typed API client), §10 env drops `JWT_SECRET`/cookie vars (adds `NEXT_PUBLIC_CERT_TENANT_SLUG`), §13 Q-2=CSR, R-4=XSS/in-memory risk.
  - D9 added 2026-08-06 (Cert API auth deferred to new C-Auth phase; Phase D gate now requires C-Auth done)
- **`specs/` stale bits fixed** to match the Cert API:
  - Seed groups → **`cert-admin` / `cert-staff` / `cert-user`** (`auth/role-resolution.md` §4, `auth/jwt-verification.md` claim example)
  - Attendee bulk import is a **JSON payload** (not multipart CSV): `api-client/README.md`, `components/README.md`, `pages/README.md`, `testing/README.md`, `data-flow.md`; CSV parsing stays client-side
  - Env naming consistent (`NEXT_PUBLIC_CERT_TENANT_SLUG` matches retrofit spec §10.1)
- **Committed and pushed** to `migration/implementation` branch
- **All 15 specs promoted to Final**:
  - `specs/README.md`, `specs/auth/` (6), `specs/api-client/README.md`, `specs/testing/README.md`, `specs/data-flow.md`, `specs/pages/README.md`, `specs/components/README.md`, `specs/environment/README.md`, `specs/deployment/README.md`, `specs/local-dev/README.md`
- **Environment spec** updated with 4-var contract (`NEXT_PUBLIC_CERT_API_BASE_URL` + `NEXT_PUBLIC_CERT_API_TARGET`)
- **Governing `legacy-e-cert-integration.md` v2.1 Final** synced from `loa-apache-server-apps`
- **Mock API server** built (`mock/server.ts`) — Express-based, all Cert API v1.2 endpoints, realistic seed data
- **Playwright e2e** scaffold (`e2e/`) — config + auth fixtures + test structure
- **`next.config.ts`** updated with mock/live rewrite toggle
- **`.env.example`** created with 4-var contract
- **`AI-RULES.md`** created — spec-first rule, CSR architecture rules, phase tracker, anti-patterns
- **package.json** cleaned — removed legacy deps (Supabase, bcrypt, puppeteer, qrcode, jose, nodemailer); added express, concurrently, playwright

### In Progress
- (none)

### Next Action
- [ ] **Wait for C-Auth phase** — Phase D gate requires C-Auth (Cert API auth middleware) complete
- [ ] **Begin Phase D** — Auth swap (delete legacy auth, add SSO fragment, in-memory token, route guard)
- [ ] **Start Phase E prep** — Implement typed API client (`src/lib/api/`) while waiting for C-Auth

### Backlog / Known Gaps
- Phase D blocked: needs C-Auth phase completed (Cert API `jwt.auth`/`jwt.endpoint` middleware + SSO endpoints)
- `api-client/` and `components/` specs have implementation sketches but could use more detail on resource modules
- Mock server exists but no component code yet to consume it (Phase E)
- Legacy app won't compile — Supabase/bcrypt deps removed but code still imports them

---

## Session Log

| Date | Work Done | Next Action |
|------|-----------|-------------|
| 2026-08-06 | Created 14 spec files (v2.0, CSR approach): auth layer (6), api-client, testing, data-flow, pages, components, environment, deployment. Committed + pushed to `migration-plan/api-migration-docs`. Created `migration/implementation` branch. | Review specs → promote to Final → begin Phase D |
| 2026-08-06 (2) | Cross-boundary: `legacy-e-cert-integration.md` → Draft v2.0 (D8 superseded, CSR — matches specs/), synced per D7; fixed specs stale bits (seed groups `cert-admin/staff/user`, attendee import JSON, CSV client-side) | Review + promote retrofit spec v2.0 + specs → Final → begin Phase D |
| 2026-08-06 (3) | All 14 specs reviewed and promoted to Final (v2.0); bumped data-flow.md to v2.0; added `NEXT_PUBLIC_CERT_API_BASE_URL` to environment spec (4-var contract); governing `legacy-e-cert-integration.md` v2.0 promoted to Final; updated SESSION-PROMPT.md | Begin Phase D — Auth swap implementation |
| 2026-08-06 (5) | Synced governing spec to v2.1 (D9: Cert API auth deferred to new C-Auth phase; Phase D gate now requires C-Auth done); auth-provisioning sections refactored to side-notes; updated SESSION-PROMPT.md next actions | Wait for C-Auth → begin Phase D |
| 2026-08-06 (6) | Built mock API server (mock/server.ts) with Express + realistic seed data (db.json); Playwright e2e scaffold (e2e/); updated next.config.ts with mock/live rewrite toggle; created .env.example; cleaned package.json (removed legacy deps, added express/concurrently/playwright); created AI-RULES.md | Wait for C-Auth → begin Phase D |

---

## Spec Status Tracker

| Spec | Version | Status | Gate |
|------|---------|--------|------|
| `specs/README.md` | 2.0 | Final | — |
| `specs/auth/README.md` | 2.0 | Final | Phase D |
| `specs/auth/jwt-verification.md` | 2.0 | Final | Phase D |
| `specs/auth/session-handling.md` | 2.0 | Final | Phase D |
| `specs/auth/sso-fragment.md` | 2.0 | Final | Phase D |
| `specs/auth/role-resolution.md` | 2.0 | Final | Phase D |
| `specs/auth/proxy.md` | 2.0 | Final | Phase D |
| `specs/api-client/README.md` | 2.0 | Final | Phase E |
| `specs/pages/README.md` | 2.0 | Final | Phase E/F |
| `specs/components/README.md` | 2.0 | Final | Phase E/F |
| `specs/environment/README.md` | 2.0 | Final | Phase D |
| `specs/deployment/README.md` | 2.0 | Final | Phase D |
| `specs/testing/README.md` | 2.0 | Final | Phase D |
| `specs/data-flow.md` | 2.0 | Final | — |
| `specs/local-dev/README.md` | 1.0 | Final | Phase D |

---

## Implementation Phase Tracker

| Phase | Work | Spec Gate | Status |
|-------|------|-----------|--------|
| **D** | Auth swap: env, SSO fragment, in-memory token, role resolution, delete auth pages/actions/server actions | Specs Final + C-Auth done | Blocked (waiting for C-Auth) |
| **E** | Data swap: typed Cert API client, delete server actions, delete legacy modules | Specs Final | Not started |
| **F** | UI cleanup + verification: removed pages/components, silent refresh, parity checks | e2e full suite passes | Not started |

---

## Anti-Scope Rules (e-cert frontend work only)

| Rule | Detail |
|------|--------|
| No Auth Platform implementation | Auth UI lives at `auth.lyceumalabang.edu.ph` |
| No Cert Platform implementation | Cert API lives at `cert-api.lyceumalabang.edu.ph` |
| No server actions | All data mutations are client-side API calls |
| No DB access | All data through Cert API |
| Specs before code, always | No implementation until governing specs are Final (Rule 0) |
| CSR approach | No httpOnly session cookie, no proxy middleware, in-memory token only |
