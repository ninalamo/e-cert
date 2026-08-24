# LOA e-cert — Environment Contract
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Infrastructure Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §10.1

---

# 1. Purpose

It answers:

> **"What environment variables does the refactored `e-cert` SPA need?"**

---

# 2. Env Variables

## 2.1 Added (client-side, `NEXT_PUBLIC_*`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_AUTH_BASE_URL` | `https://auth.lyceumalabang.edu.ph` (SSO login redirect) |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | `loa-e-cert` (for client-side JWT tenant check) |
| `NEXT_PUBLIC_CERT_API_BASE_URL` | `https://cert-api.lyceumalabang.edu.ph` (server-to-server if needed; browser uses rewrite) |

## 2.2 Kept

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | `https://e-cert.vercel.app` |

## 2.3 Removed

| Variable | Reason |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | No DB access |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No DB access |
| `SUPABASE_SERVICE_ROLE_KEY` | No DB access |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email owned by Cert |
| `AUTH_JWT_SECRET` | Client doesn't verify signatures |
| `AUTH_JWT_EXPIRY`, `AUTH_REFRESH_EXPIRY`, etc. | Auth Platform owns token lifecycle |
| `JWT_SECRET` | Not needed client-side |
| `ENCRYPTION_KEY` | SSO decryption happens in Cert |

---

# 3. Minimal Env

```env
NEXT_PUBLIC_BASE_URL=https://e-cert.vercel.app
NEXT_PUBLIC_AUTH_BASE_URL=https://auth.lyceumalabang.edu.ph
NEXT_PUBLIC_CERT_TENANT_SLUG=loa-e-cert
NEXT_PUBLIC_CERT_API_BASE_URL=https://cert-api.lyceumalabang.edu.ph
```

Four client-side variables. No server-side secrets.

---

# 4. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Keeping Supabase env vars | No DB access |
| Keeping SMTP env vars | Email owned by Cert |
| Adding `JWT_SECRET` | Client doesn't verify signatures |
| Adding `ENCRYPTION_KEY` | SSO decryption happens in Cert |

---

# 5. Guiding Principle

> **Three env vars, all public.** The CSR approach needs only base URLs and a tenant slug. No secrets, no server-side config.
