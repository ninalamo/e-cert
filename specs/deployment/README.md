# LOA e-cert — Deployment Topology
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Infrastructure Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §10.3–10.7

---

# 1. Purpose

It answers:

> **"How is the refactored `e-cert` SPA deployed, and how does it connect to the Auth and Cert platforms?"**

---

# 2. Topology

```
Browser → e-cert.vercel.app (Next.js 16, client-side SPA)
                │
                ├── SSO redirect → auth.lyceumalabang.edu.ph (Auth Platform)
                │
                └── /api/v1/* rewrite → cert-api.lyceumalabang.edu.ph (Cert API)
```

---

# 3. Vercel Rewrite

```javascript
// next.config.js
async rewrites() {
  return [{
    source: "/api/v1/:path*",
    destination: "https://cert-api.lyceumalabang.edu.ph/api/v1/:path*",
  }];
}
```

- Browser stays same-origin (`e-cert.vercel.app`).
- `loa_cert_refresh` cookie (Path=/api/v1/auth) works through the rewrite.
- Multipart uploads and PDF binary streams pass through.

---

# 4. Cookie Scope

| Cookie | Set by | Domain | Path | SameSite |
|--------|--------|--------|------|----------|
| `loa_cert_refresh` | Cert Platform (via rewrite) | `e-cert.vercel.app` | `/api/v1/auth` | Lax |

No `session` cookie. No httpOnly access token cookie. In-memory only.

---

# 5. Env Contract

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | `https://e-cert.vercel.app` |
| `NEXT_PUBLIC_CERT_API_BASE_URL` | Used for server-to-server if needed; browser uses rewrite |
| `NEXT_PUBLIC_AUTH_BASE_URL` | `https://auth.lyceumalabang.edu.ph` (SSO redirect) |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | `loa` (for client-side JWT tenant check) |

No `JWT_SECRET` needed (client doesn't verify signatures). No Supabase vars. No SMTP vars.

---

# 6. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Direct cross-origin API calls | Causes CORS issues; cookie scope problems |
| Using `/api` prefix without rewrite | Browser can't talk directly to Cert API host |
| Setting `SameSite=None` on refresh cookie | Unnecessary with same-origin rewrite |
| Adding `JWT_SECRET` to env | Client doesn't verify JWT signatures |

---

# 7. Guiding Principle

> **Same-origin via rewrite, client-side only.** The browser talks only to `e-cert.vercel.app`. The Vercel rewrite forwards API calls. No server-side auth, no server-side secrets.
