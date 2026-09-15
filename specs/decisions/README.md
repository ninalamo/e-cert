# Decisions

Architectural decision records for the e-cert frontend. Short + normative.

| # | Decision | Status |
|---|----------|--------|
| D1 | [CSR SPA, no SSR auth](csr-spa.md) | Accepted — in-memory token, no cookies, no server actions |
| D2 | [Same-origin BFF pass-through](bff-passthrough.md) | Accepted — path+query forward, no logic |
| D3 | [JWT parse-for-display only](jwt-display-only.md) | Accepted — Cert API enforces, UI gates |
| D4 | [Fresh start, no migration](fresh-start.md) | Accepted — users re-register on Auth |

New decisions: copy `_template.md` shape (Context → Decision → Consequences), keep to one page.
