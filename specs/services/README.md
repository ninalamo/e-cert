# Services (technical capabilities)

**Version:** 1.0
**Status:** Final
**Layer:** `services` (no business logic — API, auth, platform, testing)
**Audience:** Engineers, AI Development Agents

> Frontend equivalent of backend `services/`: reusable technical plumbing every feature consumes. Business workflows live in `../features/`.

---

# 1. Purpose

It answers:

> **"How does the SPA talk to the backends, hold identity, configure env, and verify itself?"**

---

# 2. Scope

## Owns

- `api-client.md` — typed Cert API client (`src/lib/api/`), BFF pass-through, envelope + errors.
- `auth.md` — SSO fragment, in-memory token, JWT parse-for-display, role resolution, guards.
- `platform.md` — env contract (4 vars), Vercel rewrite, data-flow + trust boundaries.
- `testing.md` — Vitest + Playwright + mock server workflow.

## Does Not Own

- Feature behavior (see `../features/`), routes (see `../views/`), shared visuals (see `../ui/`).
- Cert API implementation, Auth UI/issuance, PDF/QR/email generation — referenced by contract only.

---

# 3. Spec Map

| Spec | Governs | Source (migrated) |
|------|---------|-------------------|
| `api-client.md` | `src/lib/api/*`, BFF behavior | `specs/api-client/`, `components/api-bff-layer.md`, `openapi/cert-api.yaml` |
| `api-bff-layer.md` | BFF transport detail (implemented record) | `components/api-bff-layer.md` (promoted Draft→Final) |
| `auth.md` | `src/lib/auth/*`, guards | `specs/auth/` (9 files consolidated) |
| `platform.md` | env, topology, data-flow | `specs/environment/`, `specs/deployment/`, `specs/data-flow.md` |
| `vercel-deploy.md` | Vercel settings, env values, verification | new (from codebase review) |
| `testing.md` | unit + e2e + mock | `specs/testing/`, `specs/local-dev/` |

Contract reference: `../openapi/cert-api.yaml` (kept as-is — Cert-owned shape, never reshaped here).

---

# 4. Rules

- Services never import `views/`, `features/`, or `ui/`. Direction is downward only (see root `dependency-rules.md`).
- No business rules in services — envelope handling, token plumbing, env validation only.
- No Supabase, no server actions, no secrets in services.

---

# 5. Tests

Per sub-spec; minimum: `auth.md` → sso/refresh/gating suites; `api-client.md` → CRUD suites; `platform.md` → rewrite + cookie scope; `testing.md` → full matrix.

---

# 6. Guiding Principle

> **Plumbing, not policy.** Services move tokens and JSON; features decide what they mean.
