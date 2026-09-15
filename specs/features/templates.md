# Templates

**Version:** 1.0
**Status:** Final
**Layer:** `features/templates`
**Audience:** Engineers, AI Development Agents

---

# 1. Purpose

It answers:

> **"How do staff edit certificate and email templates in TipTap and persist them?"**

Detail: `template-visibility.md` (normative for owner visibility).

---

# 2. Scope

## Owns

- `src/features/templates/` — TipTap editors (certificate + email), list, `[id]` edit.
- Auth-email templates explicitly excluded (Auth Platform).

## Does Not Own

- Template rendering/PDF merge (Cert Platform).

---

# 3. UI Contract

| Item | Location | Notes |
|------|----------|-------|
| certificate templates | `src/app/(dashboard)/templates/certificates*` | TipTap canvas |
| email templates | `src/app/(dashboard)/templates/emails*` | `type=email` |

---

# 4. API Calls

| Action | Method + Path | Auth |
|--------|---------------|------|
| list | `GET /templates?organization_id=&type=&with_lock=` | `read` |
| get | `GET /templates/{id}` | `read` |
| auth-template read | `GET /templates/auth/{process}` | `read` |
| create/update/delete | `POST /templates`, `PATCH/DELETE /templates/{id}` | `write` |

---

# 5. Rules

- Persist via `PATCH /templates/{id}`; owner set includes last editor (differs from events).
- No auth-email template editing here.

---

# 6. Tests

- [ ] Planned e2e: template CRUD + TipTap persistence (see `../services/testing.md`).

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Editing auth emails here | Owned by Auth Platform |

---

# 8. Guiding Principle

> **Edit the layout here; render it on Cert.**
