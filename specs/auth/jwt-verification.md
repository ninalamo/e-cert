# LOA e-cert — Client-Side JWT Parsing
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Auth Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §6.4, refined by CSR decision.

---

# 1. Purpose

It answers:

> **"How does the `e-cert` client-side code parse a JWT access token to extract identity and role for UI gating?"**

This is **not** security enforcement. The Cert API enforces authorization server-side. This is purely for UI rendering decisions (show/hide nav items, redirect to correct home page).

---

# 2. Scope

## Owns

- Client-side JWT parsing (decode base64url payload, extract claims)
- Claim extraction (`sub`, `email`, `name`, `groups`, `permissions`)
- Token expiry check (UI-level, not security)

## Does Not Own

- Token signature verification (Cert API does this server-side)
- Token signing (Auth Platform)
- Authorization enforcement (Cert API `jwt.endpoint` middleware)

---

# 3. Contract

## 3.1 Access-Token Claim Shape

```json
{
  "sub": "<user-uuid>",
  "email": "user@example.com",
  "name": "Juan Dela Cruz",
  "groups": ["cert-staff"],
  "permissions": [
    "cert.certificates.issue",
    "read:/api/v1/events",
    "write:/api/v1/certificates"
  ],
  "scopes": [],
  "tenant": { "id": "<tenant-uuid>", "slug": "loa" },
  "iat": 1754000000,
  "exp": 1754000900,
  "type": "access"
}
```

## 3.2 Parsing (no signature verification)

```typescript
// src/lib/auth/jwt.ts
export function parseAccessToken(token: string): JwtPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.type !== "access") return null;
    if (payload.exp * 1000 < Date.now()) return null; // expired
    if (payload.tenant?.slug !== process.env.NEXT_PUBLIC_CERT_TENANT_SLUG) return null;
    return payload;
  } catch {
    return null;
  }
}
```

## 3.3 Output Shape

```typescript
interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  groups: string[];
  permissions: string[];
  tenant: { id: string; slug: string };
}
```

---

# 4. Security Note

This parsing is **not** a security boundary. The JWT signature is not verified client-side. Authorization is enforced by the Cert API on every request. The client-side parsing is only for:

- Displaying user name/email in the UI
- Deriving the coarse role for nav gating
- Showing/hiding UI elements based on role

If a user tampers with the JWT payload client-side, the Cert API will reject the request (invalid signature).

---

# 5. Callers

| Caller | How it uses parsing |
|--------|---------------------|
| `src/lib/auth/token-store.ts` | Stores raw token; parses on read for UI state |
| `src/lib/permissions.ts` | Reads parsed claims for role derivation |
| Auth guard (route protection) | Checks if token exists and is not expired |

---

# 6. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Verifying JWT signature client-side | Wasteful and unnecessary; Cert API enforces |
| Using `jose.jwtVerify` in the browser | Server-side library; client uses base64 decode |
| Caching parsed claims across token refreshes | Re-parse from fresh token on every read |
| Trusting client-parsed claims for authorization | Cert API is the source of truth |

---

# 7. Guiding Principle

> **Parse, don't verify.** The client decodes the JWT payload for UI decisions. The Cert API verifies signatures and enforces authorization.
