# e-cert Specs

**Version:** 3.0
**Status:** Final
**Layer:** index (views / features / ui / services)
**Audience:** Engineers, AI Development Agents

> Source of truth for the e-cert frontend. **Specs before code (Rule 0):** no implementation code against a Draft spec; Final specs are normative. Code matches spec, never the reverse.
>
> Pattern: lightweight frontend-only adaptation of `loa-apache-server-apps` (no kernels/domains/contexts — just `views` / `features` / `ui` / `services`). New spec? Copy `_template.md`.

---

# 1. Layers

```
specs/
├── _template.md        # lightweight spec template (copy for new specs)
├── views/README.md     # routes: which URL renders which feature, who can see it
├── features/           # UI workflows (one spec per src/features/*)
├── ui/                 # shared dumb components (src/components/*)
├── services/           # plumbing: api-client, auth, platform, testing
├── decisions/          # ADRs (CSR, BFF, JWT-display, fresh-start)
└── openapi/            # Cert-owned contract reference (never reshaped here)
```

Dependency direction: `views → features → ui`, `features → services`. Never upward, never cross-feature. See root `dependency-rules.md`.

---

# 2. Spec Map

| Spec | Layer | Governs |
|------|-------|---------|
| `views/README.md` | views | route table, gating, removed Auth-owned pages |
| `features/README.md` | features | index of feature workflows |
| `features/events.md` | features | events + attendees + import |
| `features/attendee-deletion.md` | features | delete-preview + with-cert (normative detail) |
| `features/event-visibility.md` | features | public/private event flag (normative detail) |
| `features/certificates.md` | features | issue/bulk/PDF/QR/revoke + participant mine |
| `features/templates.md` | features | TipTap certificate + email templates |
| `features/template-visibility.md` | features | template owner visibility (normative detail) |
| `features/dashboard-audit.md` | features | stats + audit + faq |
| `ui/README.md` | ui | shared primitives, empty/error states |
| `ui/not-found-state.md` | ui | unified not-found (detail) |
| `ui/ios-mobile.md` | ui | CSS-only iOS native feel — all routes, no new pages |
| `services/README.md` | services | index of technical capabilities |
| `services/api-client.md` | services | typed `src/lib/api/` + BFF behavior |
| `services/api-bff-layer.md` | services | BFF transport detail (implemented record) |
| `services/auth.md` | services | SSO, token, guard, roles |
| `services/platform.md` | services | env, BFF topology, trust boundaries |
| `services/vercel-deploy.md` | services | Vercel settings, exact env values, verification |
| `services/testing.md` | services | Vitest + Playwright + mock server |
| `decisions/` | decisions | D1–D4 accepted ADRs |
| `openapi/cert-api.yaml` | contract | Cert-owned shapes (reference only) |

---

# 3. Statuses

| Status | Meaning |
|--------|---------|
| Draft | Being written. No implementation code. |
| Final | Approved. Code must match it. |

All specs in this tree are Final. New drafts are marked inline.

---

# 4. Guiding Principle

> **Specs before code. Client-side only.** If no spec covers it, write the spec first.
