# glossary.md

# LOA e-cert Frontend — Glossary

**Version:** 1.0
**Status:** Final

| Term | Meaning |
|------|---------|
| views | Next.js routes (`src/app/`, specs in `specs/views/`). Shells: guard + render. |
| features | UI workflows (`src/features/*`, specs in `specs/features/`). e.g. events, certificates, templates. |
| ui | Shared dumb components (`src/components/`, specs in `specs/ui/`). No fetching. |
| services | Technical plumbing (`src/lib/api/`, `src/lib/auth/`, config; specs in `specs/services/`). No business logic. |
| BFF | Two Route Handlers (`src/app/api/v1/[...path]/route.ts`, `src/app/api/events/[...path]/route.ts`): forward to `CERT_API_URL`/`AUTH_API_URL`. No logic. |
| SSO fragment | `#payload=<encrypted>` redirect from Auth; handled client-side, exchanged at `POST /auth/callback`. |
| token-store | In-memory access-token holder. Never persisted. |
| permissions claim | JWT `permissions[]` (`<level>:<path>`); UI gating display; Cert enforces. |
| tenant slug | JWT `tenant.slug` (`loa-e-cert`); org resolution server-side. |
| envelope | Cert response shape `{ data \| data+meta \| status/error }`. |
| mock | Express server (`mock/server.ts :3001` + mock-auth `:3002` + `db.json`) mirroring Cert API for dev/e2e. |
| Rule 0 | Specs-before-code gate (see `AI-RULES.md`). |
