# D2 — Same-origin BFF pass-through

**Status:** Accepted
**Date:** 2026-09-15

## Context

Browser must reach the Cert API without CORS/cookie-scope issues, and without leaking the Cert host.

## Decision

Two Route Handlers forward same-origin browser traffic server-side with no transform, validation, enrichment, or auth injection: `src/app/api/v1/[...path]/route.ts` (all `/api/v1/*`, Cert vs. Auth target per path) and `src/app/api/events/[...path]/route.ts` (legacy bulk path → Cert). Targets come from server-side `CERT_API_URL`/`AUTH_API_URL` (production fallbacks in code).

## Consequences

- Unexpected data = upstream issue, never the proxy.
- No rewrites in `vercel.json`/`next.config.ts`; cookie/header forwarding lives in the handlers (see `../services/api-bff-layer.md`).
