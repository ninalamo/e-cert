# D3 — JWT parse-for-display only

**Status:** Accepted
**Date:** 2026-09-15

## Context

UI needs role/tenant display without a DB lookup, but must not become a security boundary.

## Decision

Client parses JWT claims (`permissions`, `tenant.slug`) for gating display via `resolveRoleFromPermissions()`. Cert API `jwt.auth`/`jwt.endpoint` verifies signature, expiry, tenant, and level server-side.

## Consequences

- Forged/edited tokens fail closed at the API.
- No `JWT_SECRET` in e-cert env.
