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
9. specs/testing/README.md                - Playwright + MSW e2e strategy (v2.0)
10. specs/data-flow.md                    - service dependencies, security boundaries
11. specs/pages/README.md                 - pages to keep/remove
12. specs/components/README.md            - modules to keep/remove/adapt
13. specs/environment/README.md           - env contract (3 vars)
14. specs/deployment/README.md            - Vercel topology
15. SESSION-PROMPT.md                     - this file: "Last Session Notes" = where we stopped

Then:
- Summarize the spec status (all Draft) and what's implemented vs pending
- List what's Done, In Progress, Backlog
- Identify the NEXT action item from "Last Session Notes"
- Do NOT write any code until the governing specs are Final
```

---

## Last Session Notes

### Date: 2026-08-06

### Completed
- **Specs created (14 files, all Draft v2.0, CSR approach):**
  - `specs/README.md` — assembly overview, architecture note (CSR), spec map, governing decisions, anti-patterns
  - `specs/auth/` — 6 specs: SSO integration, in-memory token store, client-side JWT parsing, SSO fragment handler, role resolution, client-side route guard
  - `specs/api-client/README.md` — typed Cert API client with base client, resource modules, error handling
  - `specs/testing/README.md` — Playwright + MSW single test layer, 20+ scenarios, fixtures, acceptance criteria
  - `specs/data-flow.md` — service dependency map, auth requirements, data storage, tampering prevention, 3 trust boundaries
  - `specs/pages/README.md` — pages to keep/remove, feature semantics changes
  - `specs/components/README.md` — modules to keep/remove/adapt, file count impact
  - `specs/environment/README.md` — 3 env vars (NEXT_PUBLIC_* only)
  - `specs/deployment/README.md` — Vercel topology, same-origin rewrite
- **Architecture decision: CSR over SSR** — no server actions, no httpOnly session cookie, no proxy middleware, in-memory token only, MSW mocks 100% of API calls
- **Committed and pushed** to `migration-plan/api-migration-docs`
- **New branch created:** `migration/implementation`

### In Progress
- (none — specs are Draft, awaiting review)

### Next Action
- [ ] **Review specs** — read through all 14 files, mark anything that needs changes
- [ ] **Promote to Final** — update `Status: Draft` to `Status: Final` in each spec when satisfied
- [ ] **Begin Phase D** — Auth swap implementation (delete legacy auth, add SSO fragment, in-memory token, route guard, delete server actions)
- [ ] **Or: flesh out stub specs** — `api-client/`, `pages/`, `components/` could use more detail before coding

### Backlog / Known Gaps
- All specs are **Draft** — no code until Final (Rule 0)
- `api-client/` spec has implementation sketches but could use more detail on each resource module
- `pages/` and `components/` specs list what stays/removes but don't detail the adaptation work
- Testing spec references MSW mocks but no actual mock handlers exist yet
- No `.env.example` updated for the new 3-var env contract
- `src/proxy.ts` still exists — needs deletion when Phase D starts

---

## Session Log

| Date | Work Done | Next Action |
|------|-----------|-------------|
| 2026-08-06 | Created 14 spec files (v2.0, CSR approach): auth layer (6), api-client, testing, data-flow, pages, components, environment, deployment. Committed + pushed to `migration-plan/api-migration-docs`. Created `migration/implementation` branch. | Review specs → promote to Final → begin Phase D |

---

## Spec Status Tracker

| Spec | Version | Status | Gate |
|------|---------|--------|------|
| `specs/README.md` | 2.0 | Draft | — |
| `specs/auth/README.md` | 2.0 | Draft | Phase D |
| `specs/auth/jwt-verification.md` | 2.0 | Draft | Phase D |
| `specs/auth/session-handling.md` | 2.0 | Draft | Phase D |
| `specs/auth/sso-fragment.md` | 2.0 | Draft | Phase D |
| `specs/auth/role-resolution.md` | 2.0 | Draft | Phase D |
| `specs/auth/proxy.md` | 2.0 | Draft | Phase D |
| `specs/api-client/README.md` | 2.0 | Draft | Phase E |
| `specs/pages/README.md` | 2.0 | Draft | Phase E/F |
| `specs/components/README.md` | 2.0 | Draft | Phase E/F |
| `specs/environment/README.md` | 2.0 | Draft | Phase D |
| `specs/deployment/README.md` | 2.0 | Draft | Phase D |
| `specs/testing/README.md` | 2.0 | Draft | Phase D |
| `specs/data-flow.md` | 1.0 | Draft | — |

---

## Implementation Phase Tracker

| Phase | Work | Spec Gate | Status |
|-------|------|-----------|--------|
| **D** | Auth swap: env, SSO fragment, in-memory token, role resolution, delete auth pages/actions/server actions | Specs Final + e2e auth tests pass | Not started |
| **E** | Data swap: typed Cert API client, delete server actions, delete legacy modules | Specs Final + e2e domain tests pass | Not started |
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
