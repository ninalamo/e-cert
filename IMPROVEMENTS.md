# Code Review — Improvement Feedback

Prioritized findings from a full project scan. Ordered by severity.

---

## Critical — Fix Now

### 1. No Test Files
There are zero test files in the project. Add unit tests for `BaseRepository`, `verifyToken`, `comparePassword`, `generateCertificateNumber`, `checkRateLimit`, and integration tests for the API routes before shipping further features.

### 2. Duplicate `supabaseAdmin()` Factories ✅
The `supabaseAdmin()` function was duplicated independently in 6 files — `auth.actions.ts`, `auth.repository.ts`, `permissions.ts`, `proxy.ts`, `tokens.ts`, and `seed/index.ts` — instead of importing the shared instance from `@/lib/supabase/admin`. 

**Fix applied:** Consolidated all local factories to use `import { supabaseAdmin } from "@/lib/supabase/admin"`. Removed `getSeedAdmin()` from `seed/index.ts` in favor of the shared singleton.

### 3. Weak & Placeholder Secrets
- `AUTH_JWT_SECRET` in `.env` is `"this-is-a-secret-key-for-jwt-authentication"` — not cryptographically random
- `HEALTH_PASSWORD` is `"password123"`
- `SEED_PASSWORD` is `"password123"`

**Fix:** Generate strong random values for all secrets and store them in a secrets manager for production.

### 4. `as never` Casts Bypass Type Safety ✅
`save-pdf/route.ts` was casting `metadata` to `never` to bypass TypeScript checking. Fixed by using `as Partial<Certificate>` with proper type import instead.

### ~~5. Missing `src/middleware.ts`~~ ✅ Invalid — Next.js 16 uses `proxy.ts` (not `middleware.ts`) for proxy/middleware wiring. The `next.config.ts` configures the proxy correctly.

---

## High Priority

### 6. BaseRepository Silently Swallows Errors
`findById` returns `null` on error, `findMany` returns `[]`, and `create` logs to console but returns a success result. Database failures are completely masked, making debugging difficult.

**Fix:** Either throw on error or return a typed result union (`{ data: T | null; error: string | null }`) consistently.

### 7. Workflow Duplication — Accepted
`src/workflows/issue-certificates.ts` contains logic similar to `attendee.service.ts` → `issueCertificatesForCompleted()`. However, the workflow has different architectural constraints (step-level granularity, Node.js module restrictions via the `workflow` library) that prevent simply delegating to the service function. The duplication is **accepted as necessary** given these constraints.

### 8. Password Change Doesn't Invalidate Sessions
`updatePassword` in `auth.actions.ts` updates the hash but does not invalidate existing refresh tokens or sessions. A user who changes their password can still be logged in on other sessions with the old password.

**Fix:** Call `deleteAllRefreshTokens(session.id)` after a successful password change and clear the current session.

### 9. Inconsistent Error Return Shapes
Some functions return `{ error: string }`, others throw exceptions, and others return `null`. There is no standard result type.

**Fix:** Adopt a consistent `Result<T>` type or `{ data: T | null; error: string | null }` pattern across all server actions and services.

### 10. Dynamic Import of `ORG_ID`
`getMyCertificates` in `certificate.service.ts` dynamically imports `ORG_ID` inside the function body (`await import("@/lib/org")`), while every other function imports it statically at the top. This is unnecessary and inconsistent.

**Fix:** Use the static top-level import like all other functions.

---

## Medium Priority

### 11. No ESLint / Prettier Config Files
The project has no `.eslintrc.json` or `.prettierrc` file. The `eslint` script uses `eslint-config-next` defaults, which is acceptable, but a project-level config allows customization and enforcement of project-specific rules.

### 12. No Global Error Boundary
There is no `error.tsx` or `not-found.tsx` in `src/app/` for graceful error handling. Unhandled errors will result in white-screen crashes.

### 13. Certificate PDF Generation Duplicated
PDF generation logic exists in three places: `certificate.service.ts` (`getCertificatePdfBuffer`), `certificate.actions.ts`, and `download/route.ts`. The download route reimplements rendering and caching logic that should delegate to `getCertificatePdfBuffer`.

### 14. Template Locking Makes Multiple DB Calls
`isTemplateLocked` and related functions make multiple round-trips to the database per template. These can be batched into a single query.

### 15. `next-themes` Installed but Unused
`next-themes` is a dependency but the theme toggle in `layout.tsx` uses raw `localStorage` instead of the `ThemeProvider` / `useTheme` hook. Either use the library properly or remove it.

---

## Low Priority

### 16. `createClient()` Has No Caching
`src/lib/supabase/client.ts` creates a new Supabase JS client on every call. The client should be cached and reused.

### 17. `.or()` with `ilike` in Paginated Queries
The `findPaginated` method in `event.repository.ts` uses `.or()` with `ilike` on `name` and `location`. Verify that composite indexes exist for these patterns.

### 18. SMTP Credentials in `.env` for Production
For production deployments, SMTP credentials should come from a secrets manager (e.g., Vercel KV, AWS Secrets Manager) rather than environment files.

### 19. Certificate Number Fallback Could Produce Duplicates
The `epochFallback()` path in `certificate-number.ts` bypasses the atomic `certificate_sequences` DB function and uses `Date.now() + random`. Under high concurrency with a failing DB function, this could theoretically produce duplicates. Consider making the fallback also use the sequence table or a UUID.
