# Certificates

**Version:** 1.0
**Status:** Final
**Layer:** `features/certificates`
**Audience:** Engineers, AI Development Agents

---

# 1. Purpose

It answers:

> **"How do staff issue, bulk-issue, download, and revoke certificates — and how do participants view their own?"**

---

# 2. Scope

## Owns

- `src/features/certificates/` — list, issue, `[id]` detail, PDF download, QR display, revoke, email resend; participant `my/certificates*`.

## Does Not Own

- PDF/QR/email generation or verification logic (Cert Platform, by contract).

---

# 3. UI Contract

| Item | Location | Notes |
|------|----------|-------|
| list / issue / `[id]` | `src/app/(dashboard)/certificates*` | envelope lists, search |
| my certificates | `src/app/(participant)/my/certificates*` | `/me/certificates*` only |
| PDF button / QR / verify link | detail components | Blob download; QR via API |

---

# 4. API Calls

| Action | Method + Path | Auth |
|--------|---------------|------|
| list/issue | `GET/POST /certificates` | `read` / `write` |
| get | `GET /certificates/{id}` | `read` + owner |
| pdf | `GET /certificates/{id}/pdf` | Blob binary |
| qr | `GET /certificates/{number}/qr` | `read` (lookup by certificate number) |
| revoke/delete | `POST /certificates/{id}/revoke`, `POST /certificates/expire`, `DELETE /certificates/{id}` | `admin` |
| bulk/upload | `POST /certificates/bulk`, `POST /certificates/upload` | `write` |
| email | `POST /certificates/{id}/email`, email-logs reads | `write` / `read` |
| mine | `GET /me/certificates`, `GET /me/certificates/{id}` | participant |
| public | `GET /verify/{number}`, `GET /view/{id}` | none |

---

# 5. Rules

- Bulk issue synchronous (`{ success, failed, errors }`) — no polling.
- PDFs binary streams, never base64-in-JSON.
- Revoke/delete admin-only; participant sees own only.

---

# 6. Tests

- [ ] Planned e2e: list, PDF download, revoke, issue, public verify/view (see `../services/testing.md`; only `auth-flow.spec.ts` exists today).

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Client-side PDF render | Cert streams the PDF |
| Async workflow polling | Bulk is synchronous |

---

# 8. Guiding Principle

> **Render what the API returns; let Cert own the document.**
