# API BFF Layer — Next.js Route Handler Proxy

**Version:** 1.0
**Status:** Draft
**Layer:** e-cert Frontend Assembly
**Audience:** Engineers, AI Development Agents

---

## 1. Purpose

Replace the current `next.config.ts` rewrites with a server-side BFF (Backend for Frontend) layer using Next.js Route Handlers.

**Why:** The rewrite-based proxy triggers Imunify bot detection because the same client IP appears to make requests that proxy through to a second domain. A Route Handler BFF makes all browser traffic same-origin; the server-to-server forwarding is invisible to Imunify.

---

## 2. Architecture

### Before (rewrites)

```
Browser → staging-loa-vericert.vercel.app/api/v1/...
  → [Vercel rewrite edge function]
  → cert-api.lyceumalabang.edu.ph/api/v1/...
  → Imunify sees cross-domain proxy → flags as bot
```

### After (BFF)

```
Browser → staging-loa-vericert.vercel.app/api/v1/...
  → [Next.js Route Handler, server-side Node runtime]
  → cert-api.lyceumalabang.edu.ph/api/v1/...
  → Imunify sees only browser → Next.js (same origin) → no flag
```

The browser never communicates directly with the backend APIs. All requests flow through the Next.js server.

---

## 3. Scope

### In scope

| Route pattern | Target backend | Notes |
|---|---|---|
| `/api/v1/auth/*` | Auth Platform (`AUTH_API_URL`) | SSO callback, refresh, logout. Refresh/logout require cookie forwarding. |
| `/api/v1/*` (everything else) | Cert Platform (`CERT_API_URL`) | All domain CRUD endpoints. Authorization via Bearer header. |
| `/api/events/*` | Cert Platform (`CERT_API_URL`) | Legacy path used by `attendees-tab.tsx`. Rewrites to `/api/v1/events/*` on the backend. |

### Out of scope

- Client-side SSO redirect URLs (`NEXT_PUBLIC_AUTH_BASE_URL` used in `page.tsx`, `auth-guard.tsx`, etc.) — these remain as-is; they are browser redirects, not API proxy calls.
- The `NEXT_PUBLIC_CERT_TENANT_SLUG` env var — used client-side for JWT validation; unaffected.

---

## 4. Route Handler Specifications

### 4.1 Catch-all: `/api/v1/[...path]/route.ts`

Handles all `/api/v1/*` requests. A single Route Handler exports handlers for each HTTP method.

**Target resolution:**

```
if path starts with "auth/" → AUTH_API_URL
else → CERT_API_URL
```

**Request forwarding:**

| Item | Cert API calls | Auth API calls |
|---|---|---|
| Method | forwarded as-is | forwarded as-is |
| `Authorization` header | forwarded | forwarded |
| `Content-Type` header | forwarded | forwarded |
| `Accept` header | forwarded | forwarded |
| `Cookie` header | **not forwarded** | **forwarded** (for `loa_cert_refresh` httpOnly cookie on refresh/logout) |
| Request body | forwarded (for POST/PATCH/PUT) | forwarded |
| `X-Forwarded-For` | set to `request.headers.get('x-forwarded-for')` or `request.ip` | same |

**Response forwarding:**

| Item | Behavior |
|---|---|
| Status code | forwarded as-is |
| `Content-Type` | forwarded as-is |
| Body | streamed through (no parsing). Handles JSON, binary (PDF), and empty responses. |
| `Set-Cookie` | forwarded as-is (for auth refresh cookie rotation) |

**Exported functions:** `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `HEAD`, `OPTIONS`.

Each function signature:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return handleProxy(request, await params);
}
```

### 4.2 Legacy: `/api/events/[...path]/route.ts`

Handles the legacy `/api/events/*` path used by `attendees-tab.tsx` (`authFetch`).

**Behavior:** Rewrites the path to `/api/v1/events/{path}` and forwards to `CERT_API_URL` using the same logic as 4.1.

```
/api/events/{id}/revoke-expired
  → CERT_API_URL/api/v1/events/{id}/revoke-expired
```

All forwarding rules from 4.1 apply (Authorization header, method, body).

---

## 5. Environment Variables

### New (server-side, no `NEXT_PUBLIC_` prefix)

| Variable | Required | Default | Description |
|---|---|---|---|
| `CERT_API_URL` | yes | `https://cert-api.lyceumalabang.edu.ph` | Cert Platform base URL. Used by Route Handler for all non-auth API calls. |
| `AUTH_API_URL` | yes | `https://auth.lyceumalabang.edu.ph` | Auth Platform base URL. Used by Route Handler for `/api/v1/auth/*` calls. |

### Retained (client-side)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_AUTH_BASE_URL` | SSO login redirect URL (used in `page.tsx`, `auth-guard.tsx`, `logout-button.tsx`, `user-menu.tsx`). Not used by Route Handlers. |
| `NEXT_PUBLIC_CERT_TENANT_SLUG` | Tenant slug for client-side JWT validation. Not used by Route Handlers. |

### Removed

| Variable | Reason |
|---|---|
| `NEXT_PUBLIC_CERT_API_URL` | Was only used in `next.config.ts` rewrites. Replaced by server-side `CERT_API_URL`. |

---

## 6. Files

### Files to create

| File | Purpose |
|---|---|
| `src/app/api/v1/[...path]/route.ts` | Catch-all BFF proxy for `/api/v1/*` |
| `src/app/api/events/[...path]/route.ts` | Legacy path proxy for `/api/events/*` |

### Files to modify

| File | Change |
|---|---|
| `next.config.ts` | Remove the entire `rewrites()` block. Keep all other config. |
| `.env` | Add `CERT_API_URL`, `AUTH_API_URL`. Remove `NEXT_PUBLIC_CERT_API_URL`. |

### Files unchanged

| File | Reason |
|---|---|
| `src/lib/api/client.ts` | Uses `BASE_URL = "/api/v1"` (relative). Works with Route Handlers without changes. |
| `src/lib/api/attendees.ts` | Uses `api.post(...)` from `client.ts`. Unchanged. |
| `src/app/(dashboard)/events/[id]/components/attendees-tab.tsx` | `authFetch` uses `/api/events/*` which the legacy Route Handler handles. |
| `src/lib/auth/token-store.ts` | `refreshAccessToken` uses `fetch("/api/v1/auth/refresh", ...)`. Works through Route Handler. |
| `src/lib/auth/sso-fragment.ts` | `consumeSSOPayload` uses `fetch("/api/v1/auth/callback", ...)`. Works through Route Handler. |

---

## 7. Error Handling

| Scenario | Behavior |
|---|---|
| Backend unreachable | Route Handler returns `502 Bad Gateway` with `{ "status": "error", "message": "Backend unreachable" }` |
| Backend timeout | Route Handler returns `504 Gateway Timeout` |
| Invalid/missing path segments | Route Handler returns `400 Bad Request` |
| Backend returns error | Forward the status code and body as-is (no transformation) |

---

## 8. Security Considerations

- **No token validation in the Route Handler.** The backend validates the JWT. The Route Handler is a transparent proxy; it does not inspect or validate tokens.
- **No response body inspection.** The Route Handler streams the response through without parsing. This keeps it fast and avoids accidentally leaking data.
- **Cookie forwarding is limited to auth routes only.** Cert API calls do not forward cookies. This prevents the refresh token from being sent to the wrong backend.
- **`X-Forwarded-For` is set** so the backend can log the real client IP.
- **No caching.** Route Handlers do not set any cache headers. Caching is the backend's responsibility.

---

## 9. Migration Steps

1. Create `src/app/api/v1/[...path]/route.ts`
2. Create `src/app/api/events/[...path]/route.ts`
3. Add `CERT_API_URL` and `AUTH_API_URL` to `.env`
4. Remove `NEXT_PUBLIC_CERT_API_URL` from `.env`
5. Remove `rewrites()` from `next.config.ts`
6. Deploy to Vercel staging
7. Verify all API calls work through the Route Handler
8. Confirm Imunify no longer flags the traffic

---

## 10. Testing Checklist

| Test | Expected |
|---|---|
| `POST /api/v1/auth/callback` (SSO login) | Returns 200 with access token, sets refresh cookie |
| `POST /api/v1/auth/refresh` | Returns 200 with new access token, rotates refresh cookie |
| `POST /api/v1/auth/logout` | Returns 204, clears refresh cookie |
| `GET /api/v1/events` | Returns 200 with event list |
| `POST /api/v1/events/{id}/attendees` | Returns 201 with attendee data |
| `GET /api/v1/certificates/{id}/pdf` | Returns 200 with PDF binary stream |
| `GET /api/events/{id}/revoke-expired` (legacy path) | Returns 200 via legacy Route Handler |
| Backend unreachable | Returns 502 |
