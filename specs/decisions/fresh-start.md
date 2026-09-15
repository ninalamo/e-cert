# D4 — Fresh start, no data migration

**Status:** Accepted
**Date:** 2026-09-15

## Context

Legacy Supabase data and seed users predate the Auth/Cert split.

## Decision

No legacy data porting. Users re-register on Auth; Cert starts from its own seed. `src/lib/seed/` deleted.

## Consequences

- No migration scripts in e-cert.
- Mock `db.json` carries realistic LOA seed for dev/test only.
