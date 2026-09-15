# dependency-rules.md

# LOA e-cert Frontend
## Dependency Rules Specification

**Version:** 1.0
**Status:** Final
**Audience:** Architects, Engineers, AI Development Agents

Frontend-only adaptation of the `loa-apache-server-apps` dependency model. Four layers, one direction.

---

# 1. Hierarchy

```
Views (src/app — routes)
  │
  ▼
Features (src/features/* — workflows)
  │
  ├─────▶ UI (src/components — dumb primitives)
  │
  └─────▶ Services (src/lib/api, src/lib/auth, config — plumbing)
```

Dependencies point **downward only**. Upward or circular dependencies are architectural defects.

---

# 2. Matrix

| From | To | Allowed |
|------|----|---------|
| Views | Features | ✅ (render feature workflows) |
| Views | UI | ✅ (layout, states) |
| Views | Services | ⚠️ exceptions only: `(dashboard)/users` → `usersAdminApi`/`user-activity`, `events/[id]` attendees-tab → legacy `/api/events/*` (both documented in `specs/views/`; migrate to features when touched) |
| Views | Views | ❌ |
| Features | Features | ❌ (share via `src/types/` or `ui/`) |
| Features | UI | ✅ |
| Features | Services (`lib/api`, `lib/auth`) | ✅ |
| Features | Types | ✅ |
| UI | Features / Views / Services | ❌ (props only, no fetching, no feature knowledge) |
| Services | Views / Features / UI | ❌ (plumbing only: envelopes, tokens, env, tests) |
| Any | Cert API direct (non-BFF) | ❌ (via BFF `/api/v1/*` only) |
| Any | Supabase / DB / server actions | ❌ |
| Any | Auth UI / issuance internals | ❌ (SSO redirect + callback contract only) |

---

# 3. Layer Notes

- **Views** are shells: guard + render. No `fetch()`, no `"use server"`.
- **Features** own workflows; co-locate components/hooks/types; never import another feature.
- **UI** is presentational; response unwrapping happens in features, not here.
- **Services** move tokens and JSON; no business rules, no ownership of concepts.

---

# 4. Cross-Feature Sharing

Via `src/types/` (types) or `src/components/` (visuals) only. Never `features/a → features/b`.

---

# 5. External Boundaries

- Cert concepts referenced by contract (`specs/openapi/cert-api.yaml`, `specs/services/api-client.md`) — never redefined.
- Auth referenced by SSO contract (`specs/services/auth.md`) — never duplicated.
- Violations (duplicate ownership, upward/circular deps, business logic in services/ui, direct DB) must be fixed before new functionality.

---

# 6. Guiding Rule

> Dependencies express responsibility. Views compose, features decide, UI renders, services plumb.
