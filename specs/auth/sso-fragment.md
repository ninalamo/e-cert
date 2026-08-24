# LOA e-cert — SSO Fragment Handler
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Auth Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §6.2 (SSO Flow)

---

# 1. Purpose

It answers:

> **"How does the `e-cert` client-side code detect the SSO encrypted payload in the URL fragment, forward it to the Cert callback, and establish a session?"**

---

# 2. Scope

## Owns

- Fragment detection (`#payload=`) on page load
- Fragment extraction and cleanup (`history.replaceState`)
- POST to `POST /api/v1/auth/callback` (same-origin via Vercel rewrite)
- Session establishment after successful callback
- Error handling (clear partial state, no redirect loop)

## Does Not Own

- SSO login page UI (Auth Platform)
- Encrypted payload generation (Auth Platform)
- Payload decryption (Cert Platform)
- Refresh token cookie (Cert Platform)

---

# 3. Flow

```
1. Browser lands on: https://e-cert.vercel.app#payload=<base64url_encrypted>
2. Client-side code on every page load checks window.location.hash
3. If hash starts with "#payload=":
   a. Extract the payload string
   b. Clear the fragment via history.replaceState (prevent re-processing)
   c. POST { payload } to /api/v1/auth/callback (same-origin → Cert API via Vercel rewrite)
   d. Cert decrypts + validates (exp, tenant.slug=loa-e-cert)
   e. Cert sets loa_cert_refresh cookie, returns { access_token, expires_in }
   f. e-cert stores access token in memory (no cookie)
   g. Redirect to intended destination (or /dashboard)
4. If callback fails:
   a. Clear partial state (in-memory token)
   b. Do NOT redirect back to Auth (no redirect storm)
   c. Show error or redirect to landing page
```

---

# 4. Implementation

**File:** `src/lib/auth/sso-fragment.ts` (new)

```typescript
import { setAccessToken } from "./session-handling";

const CALLBACK_PATH = "/api/v1/auth/callback";

export function hasSSOPayload(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.startsWith("#payload=");
}

export async function consumeSSOPayload(): Promise<boolean> {
  const hash = window.location.hash;
  const payload = hash.slice("#payload=".length);

  // Clear fragment immediately
  history.replaceState(null, "", window.location.pathname + window.location.search);

  if (!payload) return false;

  const res = await fetch(CALLBACK_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) return false;

  const { access_token } = await res.json();
  setAccessToken(access_token);
  return true;
}
```

**Integration point:** Called once on app initialization (e.g., in a root layout effect or auth provider).

---

# 5. Callback Endpoint

The POST goes to the **same-origin** path `/api/v1/auth/callback`, which Vercel rewrites server-side to `https://cert-api.lyceumalabang.edu.ph/api/v1/auth/callback`.

This ensures:
- The `loa_cert_refresh` cookie lands on the same origin (Path=/api/v1/auth).
- No CORS issues.
- The browser never talks directly to `cert-api.lyceumalabang.edu.ph`.

---

# 6. Error Cases

| Error | Handling |
|-------|----------|
| Missing/empty payload | Clear fragment, do nothing (user arrived without SSO) |
| Cert callback returns 400 | Invalid/expired payload; clear state, show error |
| Cert callback returns 401 | Auth failure; clear state, show error |
| Cert callback returns 403 | Tenant mismatch; clear state, show error |
| Network error | Clear state, show error; do not retry loop |
| Fragment contains multiple `#payload=` entries | Use only the first |

---

# 7. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Not clearing the fragment | Payload re-processed on every navigation |
| Redirecting to Auth on callback failure | Causes redirect storm between Auth ↔ e-cert |
| Decrypting the payload client-side | e-cert never holds `ENCRYPTION_KEY`; Cert decrypts |
| Sending the payload cross-origin | Vercel rewrite keeps it same-origin |

---

# 8. Guiding Principle

> **Client detects, server decrypts.** The client can only read the URL fragment. It extracts the encrypted payload, forwards it to Cert (same-origin), and Cert handles decryption and token exchange.
