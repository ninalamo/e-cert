# D1 — CSR SPA, no SSR auth

**Status:** Accepted
**Date:** 2026-09-15

## Context

Legacy e-cert used server actions + Supabase + SSR session cookies. The Cert/Auth platforms now own data and identity.

## Decision

e-cert is a client-side SPA: in-memory access token, no httpOnly session cookie, no server-side JWT verification, no server actions, no `src/proxy.ts`.

## Consequences

- 4 public env vars, zero secrets.
- MSW/JSON Server mocks 100% of API calls — one test layer.
- TipTap + dashboard already client-side; no SSR benefit to keep.
