# LOA e-cert — Client-Side Route Guard
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Auth Module
**Audience:** Engineers, AI Development Agents

> **Supersedes:** `auth/proxy.md` (v1.0 — server-side proxy). The proxy middleware is removed in the CSR approach.

---

# 1. Purpose

It answers:

> **"How does the `e-cert` SPA protect routes and redirect unauthenticated users without server-side middleware?"**

---

# 2. Scope

## Owns

- Client-side route protection (redirect to SSO if no token)
- CSRF protection (if needed, at the edge or via Vercel middleware)
- Rate limiting (if needed, at the edge or via Vercel middleware)

## Does Not Own

- Server-side auth injection (removed — no proxy)
- Identity header injection (removed — no server actions)
- JWT verification (client-side parsing only, see `jwt-verification.md`)

---

# 3. Removed: Server-Side Proxy

The legacy `src/proxy.ts` performed:
1. CSRF origin check → **Move to Vercel edge middleware or remove** (POST calls are same-origin via rewrite)
2. Rate limiting → **Move to Vercel edge middleware or Cert API**
3. Auth injection (`x-user-*` headers) → **Removed** — no server actions consume these
4. Route protection → **Moved to client-side** (React component / hook)

---

# 4. Client-Side Route Guard

```typescript
// src/lib/auth/auth-guard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, parseAccessToken } from "@/lib/auth";

const AUTH_LOGIN_URL = "https://auth.lyceumalabang.edu.ph/sso/login";

const PROTECTED_PREFIXES = ["/dashboard", "/certificates", "/templates", "/users", "/my"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !parseAccessToken(token)) {
      const redirect = encodeURIComponent(window.location.origin);
      router.replace(`${AUTH_LOGIN_URL}?redirect=${redirect}`);
    }
  }, [router]);

  const token = getAccessToken();
  if (!token || !parseAccessToken(token)) return null; // or loading spinner

  return <>{children}</>;
}
```

**Usage:** Wrap protected route groups in the layout:

```tsx
// src/app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
```

---

# 5. CSRF Considerations

With the CSR approach, all API calls are client-side `fetch()` to the same-origin Vercel rewrite. CSRF is less of a concern because:

- The `loa_cert_refresh` cookie is `SameSite=Lax` (not sent on cross-origin POST)
- The `Authorization: Bearer` header is not automatically sent by browsers on cross-origin requests
- Vercel rewrites are server-side; the browser never talks directly to Cert API

If additional CSRF protection is needed, it can be added at the Vercel edge middleware level.

---

# 6. Rate Limiting

Rate limiting is the Cert API's responsibility. The frontend does not need to implement it.

---

# 7. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Keeping server-side proxy for auth injection | No server actions to consume the headers |
| Implementing rate limiting in the frontend | Bypassable; belongs at the API layer |
| Checking auth on every render | Check once on mount, update on token change |

---

# 8. Guiding Principle

> **Thin client guard.** Route protection is a UI concern, not a security boundary. The client redirects unauthenticated users; the Cert API rejects unauthorized requests.
