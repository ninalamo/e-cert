# LOA e-cert — Data Flow & Security Boundaries
## Product Assembly Component Specification

**Version:** 1.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Architecture Module
**Audience:** Engineers, AI Development Agents

> **Governing specs:** All specs in `specs/auth/`, `specs/api-client/`, `specs/deployment/`

---

# 1. Purpose

It answers:

> **"What is the complete data flow from browser to backend, what requires authentication, what calls what, where is data stored, and how is tampering prevented?"**

---

# 2. Service Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (e-cert.vercel.app)                                           │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ React Pages  │  │ API Client   │  │ Auth Module                  │  │
│  │ (UI render)  │→ │ src/lib/api/ │  │ token-store.ts (memory)      │  │
│  │              │  │              │  │ sso-fragment.ts (fragment)    │  │
│  │              │  │              │  │ jwt.ts (parse, not verify)    │  │
│  │              │  │              │  │ auth-guard.tsx (route guard)  │  │
│  └──────────────┘  └──────┬───────┘  └──────────────┬───────────────┘  │
│                           │                         │                   │
└───────────────────────────┼─────────────────────────┼───────────────────┘
                            │                         │
                    fetch() │                 redirect │
                    Bearer  │                         │
                            ▼                         ▼
┌───────────────────────────────────┐    ┌────────────────────────────────┐
│ Vercel Rewrite                    │    │ Auth Platform                  │
│ /api/v1/* → cert-api.lyceumalabang│    │ auth.lyceumalabang.edu.ph      │
│                .edu.ph/api/v1/*   │    │                                │
│                                   │    │ /sso/login  (login form)       │
│ Server-side proxy, no auth logic  │    │ /sso/register                  │
└───────────────┬───────────────────┘    │ #payload= (SSO callback)       │
                │                        └────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ Cert API                          │
│ cert-api.lyceumalabang.edu.ph     │
│                                   │
│ jwt.auth middleware (verify JWT)  │
│ jwt.endpoint middleware (enforce) │
│                                   │
│ /api/v1/auth/callback (decrypt)   │
│ /api/v1/auth/refresh (refresh)    │
│ /api/v1/auth/logout (clear)       │
│ /api/v1/events/*                  │
│ /api/v1/certificates/*            │
│ /api/v1/templates/*               │
│ /api/v1/dashboard/*               │
│ /api/v1/admin/*                   │
│ /api/v1/me/*                      │
│ /api/v1/verify/* (public)         │
│ /api/v1/view/* (public)           │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ Cert Database (MySQL)             │
│ loa_cert                          │
│                                   │
│ organizations                     │
│ events                            │
│ event_attendees                   │
│ certificates                      │
│ certificate_templates             │
│ certificate_emails                │
│ certificate_sequences             │
│ audit_logs                        │
└───────────────────────────────────┘
```

---

# 3. Authentication Requirements

## 3.1 Public Endpoints (No Auth)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/verify/{number}` | GET | Verify certificate by number |
| `/api/v1/view/{id}` | GET | View certificate data |
| `/api/v1/auth/callback` | POST | SSO callback (encrypted payload) |

These are accessible without any token. The callback is public because it receives the encrypted SSO payload.

## 3.2 Authenticated Endpoints (Bearer Token Required)

| Endpoint Group | Method | Required Level |
|----------------|--------|----------------|
| `/api/v1/events/*` | GET | `read` |
| `/api/v1/events/*` | POST/PATCH/DELETE | `write` |
| `/api/v1/certificates/*` | GET | `read` + owner rule |
| `/api/v1/certificates/*` | POST | `write` |
| `/api/v1/certificates/*` | DELETE/revoke | `admin` |
| `/api/v1/templates/*` | GET | `read` |
| `/api/v1/templates/*` | POST/PATCH/DELETE | `write` |
| `/api/v1/dashboard/*` | GET | `read` |
| `/api/v1/admin/*` | GET/POST | `admin` |
| `/api/v1/me/*` | GET | `read` + owner rule |

## 3.3 Auth Flow Sequence

```
Browser                    Auth Platform              Cert API
   │                            │                        │
   │── 1. SSO redirect ────────▶│                        │
   │                            │── 2. User logs in ────│
   │◀── 3. #payload=<encrypted> │                        │
   │                            │                        │
   │── 4. POST /auth/callback ──────────────────────────▶│
   │   (encrypted payload)      │                        │── 5. Decrypt payload
   │                            │                        │── 6. Validate (exp, tenant)
   │                            │                        │── 7. Set refresh cookie
   │◀── 8. { access_token } ────────────────────────────│
   │                            │                        │
   │── 9. Store in memory       │                        │
   │                            │                        │
   │── 10. GET /events (Bearer) ────────────────────────▶│
   │                            │                        │── 11. Verify JWT (local)
   │                            │                        │── 12. Check level permission
   │                            │                        │── 13. Query database
   │◀── 14. { data: [...] } ────────────────────────────│
```

---

# 4. Data Storage Map

## 4.1 What Lives Where

| Data | Stored In | Format | TTL |
|------|-----------|--------|-----|
| Access token | Browser memory (JS variable) | JWT string | 15 min |
| Refresh token | `loa_cert_refresh` cookie (httpOnly) | Opaque string | 7 days |
| User identity | JWT claims (in access token) | `sub`, `email`, `name` | Token lifetime |
| User groups | JWT claims | `groups[]` | Token lifetime |
| Permissions | JWT claims | `permissions[]` (`<level>:<path>`) | Token lifetime |
| Events | Cert Database | MySQL rows | Permanent |
| Certificates | Cert Database | MySQL rows | Permanent |
| Templates | Cert Database | MySQL rows | Permanent |
| Audit logs | Cert Database | MySQL rows | Permanent |
| PDF files | Cert storage (disk/object store) | Binary | Permanent |
| Certificate emails | Cert Database | MySQL rows | Permanent |

## 4.2 What e-cert Never Stores

| Data | Why |
|------|-----|
| Passwords | Auth Platform owns identity |
| Refresh token (in JS) | httpOnly cookie only; JS cannot read |
| Database credentials | No direct DB access |
| SMTP credentials | Email owned by Cert |
| `JWT_SECRET` | Client doesn't verify signatures |
| `ENCRYPTION_KEY` | SSO decryption happens in Cert |

---

# 5. Tampering Prevention

## 5.1 Token Tampering

| Attack | Defense |
|--------|---------|
| User modifies JWT payload client-side | Cert API verifies signature server-side; modified token is rejected |
| User forges a JWT | Without `JWT_SECRET`, signature won't match; rejected |
| User extends token expiry | `exp` claim is checked by Cert API |
| User changes `tenant.slug` | Cert API checks tenant matches configured slug |
| User changes `permissions` | Cert API checks permissions against its own catalog, not just JWT claims |

## 5.2 Request Tampering

| Attack | Defense |
|--------|---------|
| User sends requests to wrong tenant | Cert API scopes all queries to resolved tenant from JWT |
| User accesses other user's data | Owner/author rules enforced by Cert API (§9.6 of api-endpoints) |
| User escalates privileges | Level-based grants enforced by `jwt.endpoint` middleware |
| CSRF on state-changing requests | `SameSite=Lax` on refresh cookie; `Authorization` header not sent cross-origin |
| Replay attack | JWT has `exp`; refresh token is single-use per session |

## 5.3 SSO Payload Tampering

| Attack | Defense |
|--------|---------|
| User modifies encrypted payload | AES-256-GCM authenticated encryption; tampering detected |
| User replays old payload | Payload has `exp`; Cert rejects expired payloads |
| User sends payload for wrong tenant | Cert checks `tenant.slug` in decrypted payload |

## 5.4 Data Tampering

| Attack | Defense |
|--------|---------|
| User modifies certificate data | Cert API validates all inputs; owner rules prevent cross-user edits |
| User deletes audit logs | Delete endpoints not exposed in Cert API v1.2 |
| User bypasses CSV validation | CSV is parsed client-side; Cert API validates the resulting JSON payload server-side |

---

# 6. Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUST BOUNDARY 1: Browser                                      │
│                                                                  │
│  • In-memory token (not persistent)                             │
│  • JWT parsing (UI only, not security)                          │
│  • Route guard (redirect only, not enforcement)                 │
│  • MSW intercepts all API calls in tests                        │
│                                                                  │
│  SECURITY BOUNDARY: Cert API (not browser)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    fetch() with Bearer token
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  TRUST BOUNDARY 2: Cert API                                     │
│                                                                  │
│  • jwt.auth middleware: verify signature, exp, tenant           │
│  • jwt.endpoint middleware: check level against catalog         │
│  • Owner/author rules: scope queries to identity               │
│  • Input validation: all request bodies validated               │
│  • Database queries: parameterized (SQL injection prevention)   │
│                                                                  │
│  SECURITY BOUNDARY: Database (not Cert API)                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    Parameterized queries
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  TRUST BOUNDARY 3: Database                                     │
│                                                                  │
│  • MySQL with InnoDB (ACID)                                     │
│  • Foreign key constraints                                      │
│  • Unique constraints                                           │
│  • No direct external access                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

# 7. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Trusting client-side JWT parsing for security | Cert API is the security boundary |
| Storing refresh token in JS accessible storage | httpOnly cookie only |
| Making cross-origin API calls directly | Bypasses same-origin cookie scope |
| Skipping `jwt.endpoint` checks | Level enforcement is server-side only |
| Trusting `permissions` claim without server verification | Cert API verifies against its own catalog |

---

# 8. Guiding Principle

> **Three trust boundaries, defense in depth.** The browser handles UI. The Cert API handles security. The database handles persistence. No single layer is trusted alone.
