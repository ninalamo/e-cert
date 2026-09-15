# AI-RULES.md

# LOA e-cert Frontend
## AI Development Rules

**Version:** 2.0
**Status:** Final
**Audience:** AI Coding Agents, Engineers

---

# ⛔ RULE 0: Specs Before Code — MANDATORY

**The AI agent MUST check for and read the spec before writing ANY application/implementation code.**

| Situation | Required Action |
|-----------|-----------------|
| No spec exists | Write the spec FIRST (copy `specs/_template.md`), or ask the user. Do NOT write implementation code. |
| Spec is Draft | Complete the spec FIRST. Do NOT write implementation code. |
| Spec is Final | Read it completely, then code exactly to it. |
| Concept owned elsewhere (Cert/Auth) | Reference by contract (`specs/openapi/`, `specs/services/`). Do NOT duplicate. |

Search order: `specs/views/` → `specs/features/` → `specs/ui/` → `specs/services/` → `specs/decisions/`.

**Violating this rule is a failure.** "I didn't see the spec" is not an excuse — searching is part of the task. Code matches spec, never the reverse.

---

# ⚠️ CRITICAL CLARIFICATION: Editing a Spec Is NOT "Code"

Rule 0 restricts **implementation code** (app code, routes, config, etc.). It does **NOT** restrict authoring specs.

**If the user explicitly asks to create, edit, complete, or promote a spec (e.g., Draft → Final), DO IT.**

- **Correct:** "update this Draft spec to Final" → edit, mark Final, save.
- **Correct:** "update this spec to v2.0" → edit version/status header.
- **Correct:** "implement this now-Final spec" → read it, then implement.
- **WRONG:** refusing a user-requested spec edit citing Rule 0.

**Never use Rule 0 to hard-block a request the user made explicitly.** When in doubt, ask — do not refuse.

---

# 1. Spec Files

## Location

All specs live in `specs/`:

```
specs/
├── _template.md     # copy for every new spec (lightweight)
├── README.md        # index + spec map + statuses
├── views/           # routes (README)
├── features/        # events, certificates, templates, dashboard-audit + normative details
├── ui/              # shared components + not-found-state
├── services/        # api-client, auth, platform, testing (+ archived bff detail)
├── decisions/       # D1–D4 ADRs
└── openapi/         # Cert-owned contract reference (never reshaped here)
```

## Spec Status

| Status | Meaning |
|--------|---------|
| Draft | Being written/reviewed. No implementation code. |
| Final | Approved. Code may be written against it. |

## Spec Map

| Spec | Status | Gate |
|------|--------|------|
| `specs/README.md` | Final | — |
| `specs/views/README.md` | Final | routes render |
| `specs/features/*.md` | Final | feature work |
| `specs/ui/README.md` | Final | shared visuals |
| `specs/services/api-client.md` | Final | data layer |
| `specs/services/auth.md` | Final | auth flows |
| `specs/services/platform.md` | Final | env/deploy |
| `specs/services/testing.md` | Final | verification |
| `specs/decisions/*` | Final (accepted) | architecture |

---

# 2. No Auto-Pilot — Always Ask

**The AI agent MUST NOT act autonomously. Every significant action requires explicit user confirmation.**

Requires confirmation: writing/modifying/deleting code or spec files, migrations, Docker, package installs, `.env`/secrets, running tests, committing/pushing, running dev server, any repo/service state change.

**No auto-piloting. No assumption-based action. No "I'll just do this real quick."** Unsure → ask anyway.

---

# 3. CSR Architecture Rules

- **No server-side auth:** no session cookie, no server JWT verify, no `src/proxy.ts`.
- **No server actions:** all data via client-side `src/lib/api/` through BFF.
- **In-memory only:** access token in JS memory; never `localStorage`/`sessionStorage`; refresh httpOnly (Cert-managed).
- **No local identity:** no signing, no password hashes, no users table.
- **Env contract:** `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_AUTH_BASE_URL`, `NEXT_PUBLIC_CERT_TENANT_SLUG` (+ legacy unread `NEXT_PUBLIC_CERT_API_URL`) and server-only `CERT_API_URL`, `AUTH_API_URL`. Exact values: `specs/services/vercel-deploy.md`.

---

# 4. Dependency Rules (summary)

Full matrix: `dependency-rules.md`.

- `views → features`; `features → ui | services | types`; `ui → nothing app-level`; `services → nothing app-level`.
- Forbidden: cross-feature imports, `ui`/`services` importing `features`/`views`, direct Supabase/DB, server actions, `localStorage` tokens.

---

# 5. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Coding against a Draft spec | Final gate (Rule 0) |
| Signing JWTs in e-cert | Auth owns issuance |
| Supabase direct access | All data via Cert API |
| Server actions for mutations | Client-side calls only |
| httpOnly session cookie | In-memory token only |
| `/login` for SSO | Admin-only; use `/sso/login` |
| DB role lookup | Role from JWT `permissions` claim (display); Cert enforces |
| Hardcoded `organization_id` | Resolved from JWT `tenant.slug` server-side |
| `localStorage` tokens | Memory only |

---

# 6. Environment Limitations

- CLI is **Windows PowerShell 5.1** — no `curl`/`grep`/`rg`/`head`, no `&` backgrounding; servers started via tools block/timeout.
- `npm install` is the package manager. Verify `dependencies` vs `devDependencies`.

---

> **Spec-first. No code until Final.** The spec is the source of truth; code must match the spec, never the reverse.
>
> **CSR approach.** No local identity, no server-side auth. Memory token in, Bearer out.
>
> **No auto-pilot.** Ask before acting.
