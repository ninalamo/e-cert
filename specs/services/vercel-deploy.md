# Vercel Deploy

**Version:** 1.0
**Status:** Final
**Layer:** `services` (runtime topology — how this repo ships to Vercel)
**Audience:** Engineers, AI Development Agents

---

# 1. Purpose

It answers:

> **"What do I set on Vercel to deploy e-cert, and how do I verify it?"**

---

# 2. Scope

## Owns

- Vercel project settings, environment variables, build behavior, post-deploy verification.

## Does Not Own

- Env semantics / trust boundaries (see `platform.md`), local mock workflow (see `testing.md`).

---

# 3. UI Contract

How the pieces land on Vercel (verified against this repo):

| Piece | Source | Vercel behavior |
|-------|--------|-----------------|
| App | Next.js 16 (`next.config.ts`, no `rewrites`) | auto-detected framework, `next build` |
| BFF | `src/app/api/v1/[...path]/route.ts`, `src/app/api/events/[...path]/route.ts` | deployed as serverless functions, same-origin `/api/v1/*`, `/api/events/*` |
| `vercel.json` | `{}` (empty) | no overrides needed — no rewrites, no headers, no regions |
| Install | `pnpm-lock.yaml` present | Vercel uses **pnpm** — keep the lockfile committed |
| `output: "standalone"` | `next.config.ts` | harmless on Vercel (Vercel uses its own build output) |

Browser calls same-origin `/api/v1/*` (`src/lib/api/client.ts` `BASE_URL`), so the app works on any `*.vercel.app` URL — production and previews — with zero code change. Only env values differ.

---

# 4. API Calls

None at deploy time. At runtime the BFF forwards to `CERT_API_URL` / `AUTH_API_URL` (server-side only, never `NEXT_PUBLIC_*`, never exposed to the browser). Cookie `set-cookie` passes through, so `loa_cert_refresh` is set on e-cert's own domain — no extra cookie config.

---

# 5. Rules

Actual Vercel variables (Production and Preview — verified on the project):

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_BASE_URL` | `https://staging-loa-vericert.vercel.app` | build-time (baked into client bundle); per-environment value |
| `NEXT_PUBLIC_AUTH_BASE_URL` | `https://auth.lyceumalabang.edu.ph` | build-time; SSO redirect target |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | (tenant slug) | build-time; JWT tenant display check |
| `NEXT_PUBLIC_CERT_API_URL` | `https://cert-api.lyceumalabang.edu.ph` | **legacy, unread by any code** — rewrite-era leftover, harmless; do not use in code |

Rules:

- `NEXT_PUBLIC_*` are inlined at **build** time — changing them requires a redeploy (Vercel does this automatically when env changes).
- The BFF reads server-side `CERT_API_URL` / `AUTH_API_URL`, which are **not set on Vercel** — the route handlers fall back to the production hosts (`https://cert-api.lyceumalabang.edu.ph`, `https://auth.lyceumalabang.edu.ph`). This works, but it is implicit: if the backends ever move, set the server vars on Vercel (or update the fallbacks) — and consider deleting dead `NEXT_PUBLIC_CERT_API_URL` to avoid confusion.
- Never add Supabase/SMTP/`JWT_SECRET`/`ENCRYPTION_KEY` — nothing reads them (legacy `env.ts` deleted).
- Preview deployments build with Preview env values. Point a staging backend at them if one exists; else verify read-only flows against production.

---

# 6. Tests

Post-deploy verification (production or preview URL as `$APP`):

- [ ] `curl $APP/api/v1/verify/<number>` → public verify payload, no token needed.
- [ ] `curl $APP/api/v1/events` (no token) → `401` from Cert (proves BFF reaches the API).
- [ ] Browser: protected route with no session → redirect to `{AUTH}/sso/login` (never `/login`).
- [ ] Browser: SSO login → dashboard renders (fragment → callback → memory token).
- [ ] Browser: forged/edited JWT → API `401/403` (Cert enforces, UI never trusted).

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Adding `rewrites` to `vercel.json`/`next.config.ts` | Route Handler BFF already covers `/api/v1/*` + `/api/events/*`; rewrites would bypass cookie/header forwarding logic |
| Setting `NEXT_PUBLIC_*` at runtime only | Baked at build — must be present during `next build` |
| Exposing `CERT_API_URL` as `NEXT_PUBLIC_*` | Browser must never call the Cert host directly (CORS + cookie scope) |
| Verifying against production with e2e | Use preview URL; never mutate prod data from tests |

---

# 8. Guiding Principle

> **Same-origin on every URL.** Set five vars per environment; the BFF and the client do the rest.
