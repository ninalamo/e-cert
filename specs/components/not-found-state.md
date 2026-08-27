# LOA e-cert — Unified Not-Found State
## Product Assembly Component Specification

**Version:** 1.0
**Status:** Final
**Layer:** Product Assembly (`e-cert`) — Shared Components
**Audience:** Engineers, AI Development Agents

> **Related:** `specs/README.md` (frontend assembly), `whats-next.md` (implementation log).

---

# 1. Purpose

It answers:

> **"What does the user see when a requested entity does not exist, or a route cannot be matched?"**

Today each detail view renders ad-hoc inline red text with inconsistent wording and no way back.
This spec defines one shared not-found presentation for entity views and one styled global 404 page.

---

# 2. Requirement (source of truth)

| Scenario | Presentation |
|----------|--------------|
| Entity fetch returns empty / 404 | `NotFoundState` card inside the existing layout |
| Unmatched route (App Router) | Styled global 404 (`src/app/not-found.tsx`) |

Rules:

- Wording is standardized: `«Entity» not found` + optional explanation line.
- Authenticated dashboard/participant views offer a back link to the owning list.
- Public views (`view/[id]`) show message only — no back button.
- The component must be server-component-safe (no hooks, no browser APIs) so any layout can render it.

---

# 3. Scope

## Owns

- `src/components/not-found-state.tsx` — shared presentational component
- `src/app/not-found.tsx` — global route-level 404 page
- The six entity call sites listed in §5

## Does Not Own

- Data fetching / error semantics of individual pages (unchanged)
- Transient search errors (`verify-search.tsx` inline error is a form state, not a dead end)
- Backend response codes or JSON fallbacks for unmatched API routes

---

# 4. Component API

```tsx
interface NotFoundStateProps {
  title: string;        // e.g. "Event not found"
  description?: string; // optional secondary line
  backHref?: string;    // back button rendered only when both set
  backLabel?: string;
}
```

Visual contract:

- Container: `app-card p-12 text-center` (same family as list empty states)
- Icon: `SearchXIcon` in a muted circular badge
- Title: semibold, primary text color
- Description: `text-sm text-tertiary`
- Back: `btn` link element

---

# 5. Call-site matrix

| File | title | description | backHref |
|------|-------|-------------|----------|
| `src/app/(dashboard)/events/[id]/event-detail.tsx` | Event not found | It may have been deleted. | `/events` |
| `src/app/(dashboard)/certificates/[id]/page.tsx` | Certificate not found | It may have been deleted or revoked. | `/certificates` |
| `src/app/(participant)/my/certificates/[id]/page.tsx` | Certificate not found | — | `/my/certificates` |
| `src/app/(dashboard)/templates/certificates/[id]/edit-template-form.tsx` | Template not found | It may have been deleted. | `/templates/certificates` |
| `src/app/(dashboard)/templates/emails/[id]/edit-email-template-form.tsx` | Email template not found | It may have been deleted. | `/templates/emails` |
| `src/app/view/[id]/page.tsx` | Certificate not found | Check the link or certificate number. | *(none)* |

Global 404 copy: large "404", "Page not found" heading, explanatory line, "Go home" button → `/`.

---

# 6. Acceptance Criteria

1. No bare red not-found `<p>` remains in the codebase.
2. Deleted-entity URLs render the card with correct title and working back link.
3. Unknown routes render the styled global 404.
4. Public view renders message only.
