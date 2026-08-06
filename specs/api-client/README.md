# LOA e-cert — Cert API Client
## Product Assembly Component Specification

**Version:** 2.0
**Status:** Draft
**Layer:** Product Assembly (`e-cert`) — Data Module
**Audience:** Engineers, AI Development Agents

> **Governing spec:** `legacy-e-cert-integration.md` §8 (Cert Platform API Consumption)

---

# 1. Purpose

It answers:

> **"How does the `e-cert` client-side SPA call the Cert Platform API for all data operations, replacing both Supabase access and server actions?"**

This is the **primary data layer**. Every data operation goes through these modules.

---

# 2. Scope

## Owns

- Typed HTTP client for the Cert API (`/api/v1/*` via Vercel rewrite)
- One typed module per resource (events, attendees, templates, certificates, dashboard, audit, verify)
- Response envelope handling (`{ data | data+meta | status/error }`)
- Error normalization (401 → refresh, 403 → error, 4xx/5xx → toast)
- Auth header injection (`Authorization: Bearer <in-memory token>`)
- Multipart upload support (certificate file uploads)
- Binary stream handling (PDF download)
- Pagination (`limit`/`offset`, `meta.has_more`)

## Does Not Own

- Token management (see `auth/session-handling.md`)
- PDF/QR/email generation (Cert Platform)
- Template rendering (Cert Platform)

---

# 3. Architecture

```
src/lib/api/
├── client.ts              # Base HTTP client (fetch wrapper, auth, error handling, refresh)
├── events.ts              # Event CRUD + stats + template clone
├── attendees.ts           # Attendee CRUD + JSON import + file data
├── templates.ts           # Template CRUD (certificate + email types)
├── certificates.ts        # Certificate issue + bulk + upload + PDF + revoke + email
├── dashboard.ts           # Stats + recent activity
├── audit.ts               # Audit logs query + export
├── verify.ts              # Public verify + view
└── types.ts               # Shared response types, pagination, error envelope
```

---

# 4. Base Client

```typescript
// src/lib/api/client.ts
import { getAccessToken, refreshAccessToken } from "@/lib/auth";

const BASE_URL = "/api/v1"; // same-origin via Vercel rewrite

interface ApiResponse<T> {
  data: T;
  meta?: { limit: number; offset: number; total: number; has_more: boolean };
}

interface ApiError {
  status: "error";
  message: string;
  errors?: Record<string, string[]>;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 401 → try refresh once
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      if (!retry.ok) throw await retry.json();
      return retry.json();
    }
    // Refresh failed — throw to trigger redirect to SSO
    throw { status: "error", message: "Session expired" };
  }

  if (!res.ok) throw await res.json();

  // Binary responses (PDF)
  if (res.headers.get("content-type")?.includes("application/pdf")) {
    return res.blob() as unknown as T;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};
```

---

# 5. Resource Modules

Each module wraps `api` with typed functions:

```typescript
// src/lib/api/events.ts
import { api } from "./client";

export const eventsApi = {
  list: (params?: { search?: string; status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<{ data: Event[]; meta: PaginationMeta }>(`/events${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api.get<{ data: Event }>(`/events/${id}`),
  getStats: (id: string) => api.get<{ data: EventStats }>(`/events/${id}/stats`),
  create: (data: CreateEventInput) => api.post<{ data: Event }>("/events", data),
  update: (id: string, data: Partial<Event>) => api.patch<{ data: Event }>(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  cloneTemplate: (id: string) => api.post(`/events/${id}/clone-template`),
  cloneEmailTemplate: (id: string) => api.post(`/events/${id}/clone-email-template`),
};
```

---

# 6. Feature → Endpoint Mapping

> Full mapping in `legacy-e-cert-integration.md` §8.2.

---

# 7. Key Decisions

| Decision | Detail |
|----------|--------|
| Same-origin via Vercel rewrite | Browser calls `/api/v1/*`; Vercel rewrites to Cert API |
| Bearer token | Every non-public call carries `Authorization: Bearer <access>` |
| 401 handling | Silent refresh → retry once; then throw for auth guard |
| 403 handling | Genuine lack of permission; show error, do not retry |
| PDF streams | Binary `application/pdf`; returned as Blob |
| Certificate file uploads | `multipart/form-data` |
| Attendee bulk import | JSON payload `{ attendees: [...] }` to `POST /api/v1/events/{id}/attendees/import` (CSV parsing is a front-end concern) |
| Bulk results | Synchronous `{ success, failed, errors }` |

---

# 8. Anti-Patterns

| Anti-Pattern | Why It Violates |
|--------------|-----------------|
| Direct Supabase/PostgREST calls | All data access through Cert API |
| Server actions for data mutations | All mutations are client-side API calls |
| Base64 PDF in JSON | PDFs are binary streams |
| Async workflow polling | Bulk operations are synchronous |
| Sending `organization_id` in requests | Org resolved from JWT `tenant.slug` |

---

# 9. Guiding Principle

> **One typed module per resource, client-side only.** Each Cert API resource gets its own file with typed functions. No server actions, no server-side fetching.
