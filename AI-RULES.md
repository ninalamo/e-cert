# AI-RULES.md

# LOA e-cert Frontend Refactor
## AI Development Rules

**Version:** 1.0
**Status:** Final
**Audience:** AI Coding Agents, Engineers

---

# ⛔ RULE 0: Specs Before Code — MANDATORY

**The AI agent MUST check for and read the spec before writing ANY application/implementation code.**

| Situation | Required Action |
|-----------|-----------------|
| No spec exists | Write the spec FIRST, or ask the user. Do NOT write implementation code. |
| Spec is Draft | Complete the spec FIRST. Do NOT write implementation code. |
| Spec is Final | Read it completely, then code exactly to it. |
| Concept owned elsewhere | Reference by contract. Do NOT duplicate. |

**Violating this rule is a failure.** "I didn't see the spec" is not an excuse — searching for the spec is part of the task.

The spec is the source of truth. The code must match the spec, never the reverse.

---

# ⚠️ CRITICAL CLARIFICATION: Editing a Spec Is NOT "Code"

Rule 0 restricts **implementation code** (app code, migrations, routes, config, etc.). It does **NOT** restrict the user's ability to author or maintain specs.

**If the user explicitly asks to create, edit, complete, or promote a spec (e.g., change a Draft spec to Final), DO IT.** This is a spec-authoring action, not implementation.

- **Correct:** User says "update this Draft spec to Final" → edit the spec, mark it Final, save.
- **Correct:** User says "update this spec to v2.0" → edit the version/status header.
- **Correct:** User asks to implement a spec that is now Final → read the spec, then implement.
- **WRONG:** User asks to finalize a Draft spec, and the agent refuses citing Rule 0.

**Never use Rule 0 to hard-block a request the user made explicitly.** When in doubt, ask — do not refuse.

---

# 1. Spec Files

## Location

All specs live in `specs/` within this repo. The authoritative copy of the governing spec is in `loa-apache-server-apps/assemblies/loa-cert-platform/legacy-e-cert-integration.md` — synced here per D7.

## Spec Status

| Status | Meaning |
|--------|---------|
| Draft | Being written or reviewed. No implementation code allowed. |
| Final | Approved. Code can be written against this spec. |

## Spec Map

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

# 2. Implementation Phases

| Phase | Work | Spec Gate | Status |
|-------|------|-----------|--------|
| **D** | Auth swap: env, SSO fragment, in-memory token, role resolution, delete auth pages/actions/server actions | Specs Final + C-Auth done | ✅ Complete — auth module, SSO flow, env cleanup, legacy deleted, stubs for build |
| **E** | Data swap: typed Cert API client, delete server actions, delete legacy modules | Specs Final | ✅ Complete — 122 files changed (1652 insertions, 5789 deletions); server actions deleted; typed Cert API client (`src/api/`) replaces all data operations; proxy.ts deleted |
| **F** | UI cleanup + verification: removed pages/components, silent refresh, parity checks | e2e full suite passes | Not started |

**Note:** C-Auth is complete (2026-08-11). Phase D is unblocked.

---

# 3. No Auto-Pilot — Always Ask

**The AI agent MUST NOT act autonomously. Every significant action requires explicit user confirmation.**

### What Requires User Confirmation

Before taking ANY of the following actions, the AI agent MUST ask and receive an explicit "yes" or specific instruction:

- Writing, modifying, or deleting code files
- Running database migrations
- Running Docker commands (up, down, rebuild, exec)
- Installing or updating packages (npm, pnpm)
- Updating `.env` files or secrets
- Running tests (Playwright, Vitest)
- Committing or pushing changes
- Running the dev server (`npm run dev`)
- Any action that changes repository state or running services

### The Rule

**No auto-piloting. No assumption-based action. No "I'll just do this real quick."**

If unsure whether an action requires confirmation → **ask anyway**.

If the user says "do X" and you think Y is also needed → **ask about Y, don't just do it**.

---

# 4. CSR Architecture Rules

## No Server-Side Auth

- No httpOnly session cookie
- No server-side JWT verification
- No proxy middleware (`src/proxy.ts` must be deleted)

## No Server Actions

- All ~75 server actions must be deleted
- All data operations through client-side API calls

## In-Memory Only

- Access token lives in JS memory only
- Never `localStorage` or `sessionStorage`
- Refresh token stays httpOnly (Cert-managed)

## No Local Identity

- No signing tokens
- No password hashes
- No users table

## Env Contract (4 vars only)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | UI origin |
| `NEXT_PUBLIC_AUTH_BASE_URL` | SSO login redirect |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | JWT tenant validation |
| `NEXT_PUBLIC_CERT_API_TARGET` | `mock` or `live` (rewriting target) |

---

# 5. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Writing code against a Draft spec | Spec must be Final before implementation |
| Signing JWT tokens in e-cert | e-cert is a consumer; Auth Platform owns issuance |
| Accessing Supabase directly | All data access through Cert API |
| Using server actions for data mutations | All mutations are client-side API calls |
| Adding httpOnly session cookie | CSR uses in-memory token only |
| Using `/login` for SSO | `/login` is admin-only; use `/sso/login` |
| Role resolution from DB | Role derived from JWT `permissions` claim |
| Hardcoded `organization_id` in API calls | Org resolved from JWT `tenant.slug` |
| Storing tokens in `localStorage` | Tokens in memory only |

---

# 7. Environment Limitations

## CLI Constraints

- The CLI environment is **Windows PowerShell 5.1** — Unix tools like `curl`, `grep`, `rg`, `head`, and `&` for backgrounding are not available
- Background processes do not persist across tool calls — servers started with `npx tsx` will block or timeout
- Server testing requires external tools (e.g., Postman, browser dev tools) or writing a dedicated test script
- When testing servers, use `cmd /c "start /B ..."` or write a temporary test script that starts the server, makes requests, and exits

## Package Management

- `npm install` is the supported package manager (no pnpm/yarn configured)
- Always verify new dependencies are added to the correct section (`dependencies` vs `devDependencies`)

---

> **Spec-first. No code until Final.** The spec is the source of truth; code must match the spec, never the reverse.

> **CSR approach.** No local identity, no server-side auth. The browser holds an in-memory token; the Cert API enforces authorization.

> **No auto-pilot.** Ask before acting. Every significant action requires explicit user confirmation.
