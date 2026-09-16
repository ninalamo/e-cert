# iOS Mobile — Responsive Native Feel

**Version:** 2.0
**Status:** Draft
**Layer:** `ui` (cross-cutting, owns `src/app/globals.css`, shell chrome, and component-level responsive layout)
**Audience:** Engineers, AI Development Agents

> Retrofit every route to feel like a native iOS app using **responsive Tailwind + CSS globals + component-level layout changes** — no new `page.tsx` routes. The shell becomes a bottom tab bar, tables become cards, and the template editor degrades gracefully to preview on phones.

---

# 1. Purpose

It answers:

> **"How does every page look, feel, and work like iOS on a phone?"**

Staff/admin use the app on desktops but also check events, issue certificates, and verify on iPhones. Current pages are desktop-first: `grid-cols-5` stats `src/features/dashboard/stats-cards.tsx:34`, 6-col Users table `src/app/(dashboard)/users/page.tsx:600`, 7-col Audit `src/features/audit/audit-log-table.tsx:456`, 1101-LOC attendees table `src/features/events/attendees-manager.tsx:1101`, fixed `1123×794` template canvas `src/features/templates/template-canvas.tsx`. CSS alone cannot fix these — the components need responsive Tailwind classes and layout reflows. The retrofit keeps all workflows intact, hits HIG touch targets (44pt), safe-area, vibrancy, and inset-grouped aesthetics.

---

# 2. Scope

## Owns

- Global tokens and utilities in `src/app/globals.css:1-724` (`@theme inline`, `:root`/`.dark`, `@layer base/utilities/components`).
- Shell chrome: `src/components/dashboard-shell.tsx`, `src/components/sidebar.tsx`, `src/components/mobile-nav.tsx`, `src/app/layout.tsx`.
- Shared primitives: `src/components/ui/*` (button, input, select, card, table, dialog, dropdown-menu, paginator, skeleton, breadcrumb).
- Feature components with mobile layout issues: `src/features/dashboard/components/stats-cards.tsx`, `src/features/events/components/events-list.tsx`, `src/features/audit/audit-log-table.tsx`, `src/features/events/attendees-manager.tsx`, `src/features/certificates/certificates-list.tsx`.
- Template editors: `src/features/templates/components/template-canvas.tsx`, `src/features/templates/components/template-form.tsx`, `src/features/templates/components/template-sidebar.tsx`, `src/features/templates/components/components-sidebar.tsx`, `src/features/templates/components/email-block-builder-v2/email-block-builder-v2.tsx`, `src/features/templates/components/email-block-builder-v2/block-canvas.tsx`.
- Responsive behavior for every `src/app/**/page.tsx` route — **without adding routes**.

## Does Not Own

- Feature workflows (`src/features/*` data fetching, selection state, `react-rnd` drag, CSV wizard) — owns **visual** only; JS selection/indeterminate `src/features/events/attendees-manager.tsx:624-626` and `computeUniformScale` `src/lib/certificate-renderer.ts` stay untouched.
- Cert/Auth API contracts (`src/lib/api/*`, `src/lib/auth/*`, `src/lib/permissions.ts`) — see `../services/api-client.md`, `../services/auth.md`.
- New pages or navigations — explicitly forbidden. Bottom tab bar reuses existing `sidebar.tsx:43-55` / `mobile-nav.tsx:144-155` links via CSS re-layout.
- Template editing fidelity on phones — degraded to preview/scale (see §5 Risks).

---

# 3. UI Contract

## 3.1 Global Tokens (all pages)

| Token | File | iOS Value | Notes |
|-------|------|-----------|-------|
| `--font-sans` | `src/app/globals.css:14` + `src/app/layout.tsx:8-20` | `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', var(--font-inter), Inter, ui-sans-serif` prepend | Keep `Plus Jakarta Sans` for `.font-heading` only; body → SF stack. `-webkit-font-smoothing: antialiased` already `globals.css:328`. |
| `--color-surface-muted` | `globals.css:96` | `#f2f2f7` light / `#000000` dark | Already correct — **do not change**. All phone `main` backgrounds use this grouped color. |
| `--color-surface` | `globals.css:95` | `#ffffff` / `#1c1c1e` | Card/sheet background; sheets at `0.72–0.82` alpha when blurred. |
| `--color-border` / `--color-border-strong` | `globals.css:101-102` | Hairline `0.5px solid #c6c6c8` (`#38383a` dark) via `@supports (border-width:0.5px)` — falls back to `1px`. | Replaces heavy borders on grouped lists. |
| `--radius` | `globals.css:171` | `0.625rem` base → phone cards `14–16px` (`1rem` / `radius-xl`) | `.app-card` `globals.css:563` goes `1rem` → `14px` on ≤768px; `.input` `0.75rem` → `10px`. |
| `--shadow-ios-*` | `globals.css:141-144` | Keep; but **grouped lists use hairline, not shadow** on phones | Shadow only for floating sheets/FABs. |
| `viewport` | `src/app/layout.tsx:31-37` | `width=device-width, initialScale=1, viewportFit=cover, themeColor:#f2f2f7` (light) / `#000000` (dark), **remove `maximumScale:1`** → omit or `5` | Fixes a11y pinch-zoom; `viewportFit:cover` + `--safe-*` already `globals.css:174-177` — extend to every `fixed`. |

## 3.2 Viewport & Safe Area — applies to all `fixed`/`sticky`

- Every `fixed` layer adds `env(safe-area-inset-*)`: `header`, `mobile-nav` drawer/sheet, `DialogContent`, `DropdownMenuContent`, `Toast` (`src/components/ui/sonner.tsx:1688`), `certificate-viewer.tsx:fixed inset-0 z-[200] + top-4 right-4` buttons.
- Utilities `pb-safe/pt-safe` `globals.css:390-391` used on `dashboard-shell.tsx:54` `main.p-4.pb-safe` — add `pt-safe` to `header` when `position:sticky` and to `DialogContent` bottom sheets `padding-bottom: calc(16px + var(--safe-bottom))`.
- `ios-blur` `globals.css:394-395` `backdrop-filter: saturate(180%) blur(20px)` + `ios-blur-heavy blur(40px)` applied to header + bottom tab bar + sheets (with `background: rgba(255,255,255,0.72)` light / `rgba(28,28,30,0.72)` dark).

## 3.3 Shell Chrome — single source `globals.css` overrides, no DOM change

### Header `src/components/dashboard-shell.tsx:37`

| Desktop (≥1025px) | Phone (≤1024px) — CSS only |
|--------------------|-----------------------------|
| `flex justify-between border-b bg-surface px-4 py-3` | `position:sticky; top:0; z-index:30; ios-blur; background:rgba(255,255,255,0.82); border-bottom:0.5px solid var(--color-border); padding-top: calc(0.75rem + var(--safe-top))` ; `ORG_NAME` centered when space permits; `gap-2` → `gap-3` for 44pt targets |

### Sidebar `src/components/sidebar.tsx:76-80` + MobileNav `src/components/mobile-nav.tsx:171-198`

- **≤1024px** (Tailwind `lg` breakpoint already used `lg:block` / `lg:hidden`):
  - `aside` (`sidebar.tsx`) **repurposed as bottom tab bar**: `display:flex !important; position:fixed !important; inset: auto 0 0 0 !important; height: calc(49px + var(--safe-bottom)) !important; flex-direction:row !important; padding:0 0 var(--safe-bottom) 0 !important; background:rgba(249,249,249,0.94) !important; backdrop-filter:saturate(180%) blur(20px) !important; border-top:0.5px solid var(--color-border) !important; z-index:40; overflow:visible` ; hide branding `aside > div:first-child {display:none}` ; `aside nav {flex-direction:row !important; justify-content:space-around !important; width:100% !important; space-y-0 !important}` ; `aside nav a, aside nav button {flex-direction:column !important; gap:2px !important; font-size:10px !important; min-height:44px !important; justify-content:center !important; padding:4px 8px !important; border-radius:0 !important}` ; `svg{width:22px !important; height:22px !important}` ; active state `color: var(--color-system-blue) / var(--color-brand-600)` + no `bg-brand-600` fill (iOS tint, not pill).
  - `main` compensation: `main { padding-bottom: calc(72px + var(--safe-bottom)) !important }` (49 + gutters) to avoid content under bar.
  - Hamburger `mobile-nav.tsx:171 .btn-icon.lg:hidden` → `display:none !important` at ≤1024px (bottom bar replaces drawer). Keep drawer DOM hidden (`div.fixed.inset-0 {display:none}`) unless `force-drawer` class is added later — **no new JS**.
  - Participant role `participantItems: My Dashboard / My Certificates` `mobile-nav.tsx:157-160` → 2 tabs centered, larger tap gaps.

- Alternative fallback if `aside` repurpose proves fragile (e.g., `hasAuthClaim` filters collapse Settings): hide both `aside` and `.fixed.inset-0` drawer and synthesize bar via `body::after` is **forbidden** — must reuse DOM; prefer `aside` approach, test on filtered `Settings → Users`.

- **≥1025px**: no change; `sidebar.tsx:77 collapsed w-16/w-64` and `mobile-nav` hidden remain.

### Footer

No dedicated footer component; `pb-safe` on `main` suffices. Verify/view ad-hoc footers add safe-bottom via same utility.

## 3.4 Primitives — 44pt + iOS aesthetics (all via `@media` in `globals.css`)

| Primitive | Current (`globals.css` / `ui/*`) | iOS Phone Override |
|-----------|-----------------------------------|---------------------|
| **Buttons** `ui/button.tsx:6-43` `h-8/h-9` + `.btn:0.5rem 1rem` `globals.css:431` + `.btn-brand/.btn-save/.btn-cancel` | `h-8=32px <44pt` | `@media (hover:none) and (pointer:coarse)` already `globals.css:365-372` → **expand selector** to `.btn, .btn-brand, .btn-brand-soft, .btn-save, .btn-cancel, .btn-view, [data-slot=button], [role=button]` → `min-height:44px; min-width:44px; padding:0.625rem 1.25rem` ; icon buttons `btn-icon: padding 0.625rem; border-radius:12px` ; keep `:active{transform:scale(0.97)}` `globals.css:414,443` |
| **Inputs/Selects/Textarea** `.input:0.625rem 0.875rem` `globals.css:546-561` + `ui/input.tsx:h-8` `ui/select.tsx:h-8` | Mixed `.input` vs `Input` height | Unify: `height:44px; border-radius:10px; background: var(--color-surface); border:1.5px solid var(--color-border); font-size:16px !important` (already `globals.css:359-363` ≤768px) + `appearance:none; -webkit-appearance:none` ; `select` same; `textarea.input` `min-height:88px` |
| **Cards** `.app-card:bg-surface radius 1rem border shadow-ios-sm` `globals.css:563` vs `ui/card.tsx:rounded-xl` | Two card visuals | Phone: `.app-card, [data-slot=card] { border-radius:14px; margin-inline:0; border:0.5px solid var(--color-border) }` ; `main > .app-card` gutters via `main.p-4` already — do **not** add negative margins; use `inset grouped` feel via `background:#f2f2f7` on `main` |
| **Badges/Pills** `.status-badge/status-pill: 0.6875rem` `globals.css:665-686` | Tiny 11px | Phone: `font-size:12px; padding:4px 10px` ; row badges keep `white-space:nowrap` |
| **Segmented** `.tab-bar/tab-item--active` `globals.css:688-724` | Good but could overflow | Add `overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; ::-webkit-scrollbar{display:none}` ; `tab-item{flex:1 0 auto}` + `scroll-snap` |
| **Tables → Cards** `.tbl-container/.tbl` `globals.css:614-663` + `ui/table.tsx:whitespace-nowrap` | `whitespace-nowrap` forces x-scroll | Phone `max-width:768px`: `table{ display:block } thead{display:none} tbody, tr, td, th{ display:block } tr{ display:grid; gap:8px; background:var(--color-surface); border:0.5px solid var(--color-border); border-radius:12px; padding:12px; margin-bottom:10px } td{ padding:2px 0 !important; white-space:normal !important; border:none !important } td::before{ content: attr(data-label); font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--color-text-muted); display:block; margin-bottom:2px }` — requires **no JS**: if `data-label` absent, fallback `display:grid; grid-template-columns: 1fr auto; align-items:center` with primary cell bold; hide via `overflow-x:auto` fallback remains |
| **Paginator** `ui/paginator.tsx:54` `flex-col sm:flex-row` + `p-2` buttons | `p-2≈36px` | Buttons `min-height:44px; min-width:44px; p-3; rounded:10px` ; hide `Rows per page` `<span hidden sm:inline>` already `paginator.tsx:58` — keep; add `gap:12px` |
| **Dialog → Sheet** `ui/dialog.tsx:52-58` `fixed top-1/2 -translate-x/y` + `bg-black/10 backdrop-blur-xs` | Centered zoom, not sheet | Phone `max-width:640px`: `[data-slot=dialog-overlay]{background:rgba(0,0,0,.32)} [data-slot=dialog-content]{ top:auto !important; bottom:0 !important; left:0 !important; right:0 !important; transform:none !important; max-width:none !important; width:100% !important; max-height:min(88dvh, 720px); overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; border-radius:12px 12px 0 0 !important; padding-bottom: calc(16px + var(--safe-bottom)) !important; border: none !important; box-shadow: var(--shadow-ios-xl) !important }` ; add `animation: slide-up 0.28s cubic-bezier(0.16,1,0.3,1)` |
| **Dropdown → Action Sheet** `ui/dropdown-menu.tsx:8736` `user-menu.tsx:55-68` | Top-aligned small menu | Phone `max-width:640px`: `[data-slot=dropdown-menu-content]{ position:fixed !important; bottom: calc(12px + var(--safe-bottom)) !important; left:12px !important; right:12px !important; top:auto !important; transform:none !important; width:auto !important; border-radius:14px !important; padding:8px !important }` + `ios-blur-heavy` optional |
| **Skeletons** `ui/skeleton.tsx:272` `grid-cols-5` `48` | Matches offending stats | Mirror real grid breakpoints (see §3.5) |
| **Breadcrumb** `ui/breadcrumb.tsx:2601` | Small hit area | Phone: `a, button{min-height:44px; display:inline-flex; align-items:center}` |
| **Toast** `ui/sonner.tsx:1688` | Top-center | Add `top: calc(12px + var(--safe-top))` on phones |
| **Focus** `globals.css:335-338` `outline 2px brand-500` | OK | Keep; ensure no `outline:none` regressions |
| **Motion** `transition: all 0.2s cubic-bezier(0.16,1,0.3,1)` | Everywhere | Wrap in `@media (prefers-reduced-motion: no-preference)` ; `@media (prefers-reduced-motion: reduce) { * { transition:none !important; animation:none !important } }` |

## 3.5 Page / Route Matrix — no new routes

| Route | File | Current | iOS CSS Fix (≤768px unless noted) |
|-------|------|---------|-----------------------------------|
| `/` | `src/app/page.tsx:47` | transient redirect + `FullPageLoader` | No change — centered already |
| `404` | `src/app/not-found.tsx:703` | card | Add `pb-safe pt-safe` |
| `(dashboard)` shell | `src/app/(dashboard)/layout.tsx:16` | `AuthGuard>DashboardShell` | Shell §3.3 handles |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx:61` `space-y-6` + `DashboardSearch` + `StatsCards` + `Card RecentActivity` | **HIGH: `StatsCards: grid-cols-5`** `src/features/dashboard/stats-cards.tsx:34` | `grid-cols-2` ≤640px, `grid-cols-3` 641–1024px, `grid-cols-5` ≥1025px via `grid-template-columns` override; cards `p-4` → `p-3` on phones; `ActivityFeed` rows already `divide-y px-4 py-3 flex justify-between` — keep + `radius:14px` |
| `/events` | `src/app/(dashboard)/events/page.tsx:96` → `EventsList:265` `flex sm:flex-row` + `app-card divide-y row flex justify-between` + `status-pill` + `btn-disclosure` + `Paginator` | Moderate dense row | Row right side `flex-wrap gap-2` allow wrap; badge `12px`; `btn-icon-delete p-2→p-3` 44pt; filters `flex-col` already `sm:flex-row` — add `gap-3` |
| `/events/new` | `src/app/(dashboard)/events/new/page.tsx` → `new-event-form.tsx:430` `grid sm:grid-cols-2` + `app-card 5 fields` + iframe `min-w-[400px]` | HIGH: fixed preview | Stack `grid-cols-1`; inputs `44px`; action bar `flex-col-reverse sm:flex-row` already OK but add `position:sticky; bottom:0; ios-blur; padding-bottom: var(--safe-bottom)` on phone so Save visible |
| `/events/[id]` Detail | `src/app/(dashboard)/events/[id]/page.tsx:36` → `event-detail.tsx:346` `Breadcrumb` + `flex justify-between title text-2xl + badge + trash` + `tab-bar 2 tabs` + `EventFieldsCard/StatusChangeDialog/VisibilityCard/TemplateCard` or `AttendeesTab` | HIGH: title crush, `divide-y flex justify-between px-1 py-2.5` | Title row `flex-wrap gap-2`; title `text-xl` on phones; key/value rows → iOS inset list: `flex-col items-start gap-1` with label `11px uppercase muted` + value `15px`; `tab-bar` scroll-snap (§3.4) |
| `/events/[id]` Attendees | `.../components/attendees-tab.tsx:628` + `attendees-manager.tsx:1101` `Badge selected + Unselect` + `search w-48 + select` + `Table 5 cols` + row 4 icons `size-4 p-1.5` + `fixed inset-0 issuing overlay` | **CRITICAL** | Search `w-full` on phones (`w-48` → `flex-1`); table→card §3.4; checkboxes `size-5 rounded-md`; row actions wrap `flex-wrap gap-2`; bulk bar `position:sticky; bottom: calc(60px + var(--safe-bottom))` |
| `/events/[id]/upload` | `.../upload/page.tsx:2579` → `upload-csv-form.tsx:747` 4-step wizard + drop `border-dashed py-10` + preview `Table Name(Email)/Status/Actions` | HIGH | Drop zone `py-14` bigger; preview table→card; `Attach Certificate` pill + `Remove` stack vertically; progress `h-2` keep |
| `/events/[id]/issue` | `.../issue/page.tsx:429` `issue-event-cert-form:6728` | Form | Stack, `44px` inputs, sticky save |
| `/certificates` | `src/app/(dashboard)/certificates/page.tsx:43` → `certificates-list.tsx:666` `groupByEvent app-card per event + header bg-surface-secondary` + `flex justify-between row` + `Revoke Expired` + `Select w-[180px]` + pills | Moderate | Event header `py-3` keep; row right wrap; `Select w-[180px] → w-full` on phones; pills `flex-wrap` already |
| `/certificates/[id]` | `src/app/(dashboard)/certificates/[id]/page.tsx:86` → `certificate-detail.tsx:238` `Breadcrumb` + `app-card divide-y px-4 py-3.5 key/value` + QR `Image 100-120` + `EmailHistory` | Low-moderate | QR row `flex-col` on ≤375px; already inset-list-ready — just bump `radius 14px` |
| `/certificates/issue` | `src/app/(dashboard)/certificates/issue/page.tsx` `issue-form` | Form | Same as event issue |
| `/templates/certificates` | `src/app/(dashboard)/templates/certificates/page.tsx:66` → `templates-table.tsx:321` `search sm:max-w-xs` + `flex justify-between Locked/Editable pill + Edit/View + Delete` + preview `fixed ios-blur-heavy scaled iframe` | Moderate | Row wrap; search `w-full` |
| `/templates/certificates/new` + `[id]` | `.../new/page.tsx:2293` + `.../[id]/page.tsx:240` → `template-form.tsx` toggles `flex-col lg:flex-row` + `code-editor.tsx:2518` + `lg:flex-1 lg:w-96` | HIGH (editor) | Stack vertical `flex-col`; code font `16px` (§3.4) |
| `/templates/emails*` | `src/app/(dashboard)/templates/emails/*:2214` → `template-canvas.tsx:2200+` `CANVAS_W 1123 CANVAS_H 794` + `react-rnd` + toolbar `flex flex-wrap gap-1` | **CRITICAL** | Scale: `transform: scale(min(1, calc(100vw - 32px)/1123)); transform-origin: top left; overflow-x:auto; -webkit-overflow-scrolling:touch` ; handles `div[class*=handle]{width:16px !important; height:16px !important}` ; hide sidebars `w-64 → display:none` on ≤768px and stack canvas full-width; degraded message allowed `::after{content:"Open on desktop to edit — preview only"}` overlay on ≤768px; no JS |
| `/users` | `src/app/(dashboard)/users/page.tsx:600` `Input + Select filters + Table 6 cols (User, Role, Groups, Activity, Status, Actions) + Paginator + 2 dialogs` + `role pill-group rounded-full border p-0.5` | **CRITICAL** | Filters `flex-col` full-width; table→card §3.4; pill-group wrap; Actions `gap-2 flex-wrap` |
| `/audit` | `src/app/(dashboard)/audit/page.tsx:165` → `audit-log-page.tsx` + `audit-log-table.tsx:456` `flex flex-wrap gap-3 filters 5 selects+dates` + `export/delete bar flex flex-wrap rounded-xl bg-surface-secondary p-2` + `Table 7 cols + Paginator + Dialog` | **CRITICAL** | Filters `grid-cols-1` stack; export bar `flex-col` on phones; table→card; badge wraps |
| `/my` | `src/app/(participant)/my/page.tsx:48` `grid sm:grid-cols-2 2 Cards` | Low | Cards `1 col` already via `sm:` — bump tap to `min-height:56px list-row` |
| `/my/certificates` + `[id]` | `src/app/(participant)/my/certificates/page.tsx:86` `Card flex justify-between py-4 pill` | Low-moderate | Inset grouped `radius 14px` |
| `/my/profile` | `src/app/(participant)/my/profile/page.tsx:2639` `grid sm:grid-cols-2 fields` | Low | `1 col` collapse already — OK |
| `/faq` | `src/app/faq/page.tsx` `faq-content.tsx:70 app-card p-6 sm:p-10 article` | Low | Article `text-[15px] leading-6 hyphens:auto; max-width:65ch` |
| `/verify` | `src/app/verify/page.tsx:43` `min-h-dvh flex-center max-w-md` + `VerifySearch` input | **GOOD** — mobile-first | Add `p-safe` + ensure input `44px` |
| `/verify/[n]` | `src/app/verify/[certificateNumber]/page.tsx:242` `rounded-2xl border overflow-hidden + rows flex justify-between p-4 rounded-xl bg-surface-muted` | Good | Map badge to `status-pill`; keep |
| `/view/[id]` | `src/app/view/[id]/page.tsx:95` → `certificate-viewer.tsx:246` `fixed inset-0 z-[200] flex-center + canvas scale windowSize.w*0.65` + `fixed top-4 right-4 buttons` | HIGH | Canvas: `@media (max-width:768px){ canvas-width calc(100vw - 32px) }` ; buttons `top: calc(12px + var(--safe-top)) !important; right: calc(12px + var(--safe-right)) !important` ; close `44px` |
| `/.well-known/workflow/v1/*` + `/api/*` | `src/app/api/events/[...path]/route.ts:4070` + `src/app/api/v1/[...path]/route.ts:5164` BFF proxies | None (no UI) | None |
| `loading.tsx` / `not-found.tsx` / `favicon.ico` | — | Minimal | `pb-safe` |

**Counts:** ~38 `page.tsx` + 4 `layout.tsx` + 2 BFF routes. Most painful remain `users`, `audit`, `attendees-manager`, `template-canvas`, `dashboard stats`.

## 3.6 Motion & Haptics

- Press: `:active{transform:scale(0.97); opacity:0.96}` already on `.btn*` — extend to `.app-card-hover:active` via `scale(0.99)` subtle.
- Transitions: `0.2s cubic-bezier(0.16,1,0.3,1)` (iOS spring) — guard with `prefers-reduced-motion` (§3.4).
- No CSS haptics (`navigator.vibrate` requires JS — out of scope).

## 3.7 Scrolling & Overflow

- `html, body { overscroll-behavior-y: contain }` for sheets/drawers.
- Horizontal scrollers (`tab-bar`, pill filters, `Paginator`) → `-webkit-overflow-scrolling:touch; scrollbar-width:none`.
- `min-h-dvh` already `globals.css:324` handles dynamic URL bar — keep. Add `100svh` fallback only if `dvh` unsupported (no code, just `@supports not (height:100dvh)`).

---

# 4. API Calls

This spec makes **no API calls**. All routes continue to call `src/lib/api/*` via BFF `/api/v1/*` per `../services/api-client.md`. The two documented view-level exceptions remain in `../views/README.md:70-74` and are not touched by this CSS pass.

| Action | Method + Path | Auth | Notes |
|--------|---------------|------|-------|
| — | — | — | No new endpoints; verify/view/cert operations unchanged |

---

# 5. Rules

- **Responsive Tailwind + CSS globals.** Changes span `src/app/globals.css` (tokens, overlays, motion), `src/components/*` (shell chrome), and `src/features/**/components/*` (layout reflows). All component changes use Tailwind responsive classes (`sm:`, `md:`, `lg:`) — no new CSS files.
- **No new `page.tsx`, `layout.tsx`, or `route.ts`.** Bottom tab bar reuses existing `sidebar.tsx` / `mobile-nav.tsx` link arrays. No new navigations.
- **44pt minimum** for every interactive element on `(hover:none) and (pointer:coarse)`.
- **16px input floor** on `max-width:768px` to prevent iOS zoom-on-focus.
- **Safe area on every `fixed`** element. Missed layers = notch/home-indicator clipping.
- **Hairline > shadow** for grouped lists on phones. `shadow-ios-*` reserved for sheets/FABs.
- **Preserve dark mode** `globals.css:188-268` + `color-scheme: dark`.
- **Template canvas is preview-only on phones.** Full edit remains `≥1024px`. CSS scales, touch adapts where feasible, but pixel-precise drag is desktop-only.
- **`maximumScale:1` removed** — a11y pinch-zoom restored.
- **No server mutations** — no `use server`, no Supabase, no `organization_id` additions.

---

# 6. Tests

How this is verified (manual + visual + existing automated):

- [ ] `e2e/tests/ui/ios-mobile-smoke.spec.ts` — **new** Playwright mobile suite (iPhone 14 + SE + desktop): for each route in §3.5 table → screenshot snapshot (light + dark), no horizontal overflow except intentional `overflow-x-auto` tables on desktop, header sticky, bottom bar visible ≤1024px and hidden ≥1025px, `pb-safe` not clipped.
- [ ] `e2e/tests/ui/ios-a11y.spec.ts` — touch targets ≥44px (`getBoundingClientRect`), inputs `font-size ≥16px` on mobile viewport, pinch-zoom not blocked (`maximumScale` check), focus ring `brand-500` visible, `prefers-reduced-motion: reduce` disables scale transitions.
- [ ] Manual device sweep: iOS Safari 17+ (Dynamic Island, notch, home indicator), Android Chrome, desktop Safari/Chrome. Check: safe-area insets, `ios-blur` translucency, Dialog→sheet slide-up, Dropdown→action sheet, table→card, canvas scale, viewer safe-top, Dashboard `grid-cols-2/3/5` snap.
- [ ] Visual regression: capture `light` + `dark` for `/dashboard`, `/events`, `/events/[id]` (both tabs), `/certificates`, `/certificates/[id]`, `/users`, `/audit`, `/templates/certificates`, `/verify`, `/view/[id]`, `/my` — compare against baseline in PR.
- [ ] Existing suites still pass: `pnpm test` (Vitest `src/__tests__/attendees-manager-pagination.test.ts`, `bff-proxy-route.test.ts`, `phase-h/*`) + `pnpm e2e` auth-flow.

---

# 7. Anti-Patterns

| Anti-Pattern | Why |
|--------------|-----|
| Adding a new `page.tsx` or route for "mobile" | Spec forbids new routes — reuse existing DOM |
| CSS hacks to convert tables to cards without component changes | `data-label` doesn't exist in markup, `display:block` on `<Table>` is fragile — use actual responsive components |
| `maximumScale:1` or `user-scalable=no` | Blocks a11y zoom on iOS |
| Hover-only interactions on touch devices | `onMouseEnter`/`onMouseLeave` don't fire on touch — use always-visible or tap-to-expand |
| HTML5 Drag and Drop on mobile | Not supported on touch — use up/down buttons or long-press |
| Editing `dark` tokens with hardcoded hex in component CSS | Use `var(--color-*)` tokens so dark mapping `globals.css:227-268` applies |
| Forcing `whitespace:nowrap` on mobile tables | Forces horizontal scroll — use card layout instead |
| Re-adding server actions / Supabase / `organization_id` writes | Deleted per `ui/README.md:31` / `views/README.md:81`; org from JWT server-side |

---

# 8. Guiding Principle

> **One stylesheet, every page, iOS-native — no new pages, no JS layout.**

---

# 9. Implementation Plan (normative for code PR)

**Phase 0 — Prep (no code):** This spec (`Draft → Final` approval). Freeze route table `../views/README.md`.

**Phase 1 — Shell + Navigation (components):**
1. `src/components/sidebar.tsx` — Add responsive `lg:hidden` on `aside`, expose nav items as flat array for bottom tabs.
2. `src/components/mobile-nav.tsx` — Replace hamburger+drawer with fixed bottom tab bar at `≤1024px`. Show 4-5 top-level icons + labels. Hide drawer trigger.
3. `src/components/dashboard-shell.tsx` — Add `pb-safe` compensation for bottom bar on phones. Header stays `sticky`.
4. `src/app/globals.css` — Bottom bar tokens: `backdrop-filter`, `safe-bottom`, hairline border.

**Phase 2 — Dashboard:**
5. `src/features/dashboard/components/stats-cards.tsx` — `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`. Cards `p-3` on phones.

**Phase 3 — Data tables → cards:**
6. `src/app/(dashboard)/users/page.tsx` — Replace `<Table>` with card list on mobile. Each card shows name, email, role pill, status, action buttons. Desktop table stays.
7. `src/features/audit/audit-log-table.tsx` — Same card conversion for 7-col audit table.
8. `src/features/events/attendees-manager.tsx` — Same card conversion for attendees table.
9. `src/features/certificates/certificates-list.tsx` — Already card-row layout, just needs mobile spacing fixes.

**Phase 4 — Events list:**
10. `src/features/events/components/events-list.tsx` — Row layout: status pill + View + delete stack on narrow screens. Search full-width.

**Phase 5 — Template editors:**
11. `src/features/templates/components/template-canvas.tsx` — Add `isMobile` detection. Mobile: read-only preview, auto-fit zoom, hide sidebars, toolbar condensed, touch scroll. Desktop: full edit unchanged.
12. `src/features/templates/components/template-form.tsx` — Source editor stacks full-width on mobile.
13. `src/features/templates/components/template-sidebar.tsx` + `components-sidebar.tsx` — Collapse to drawer on mobile.
14. `src/features/templates/components/email-block-builder-v2/email-block-builder-v2.tsx` — Sidebar + properties panel become bottom sheets on mobile. Block reorder via up/down buttons (hide drag handles).
15. `src/features/templates/components/email-block-builder-v2/block-canvas.tsx` — Hover actions become always-visible on mobile.

**Phase 6 — Overlays + polish:**
16. `src/app/globals.css` — Dialog → bottom sheet, dropdown → action sheet, toast safe-top, table→card generic fallback.
17. `src/components/ui/dialog.tsx` — `data-slot="dialog-content"` bottom sheet at `≤640px`.
18. `src/components/ui/dropdown-menu.tsx` — Bottom sheet action menu at `≤640px`.

**Phase 7 — QA:** Manual sweep + Playwright mobile viewport tests.

**File touch list:** `src/app/globals.css`, `src/app/layout.tsx`, `src/components/sidebar.tsx`, `src/components/mobile-nav.tsx`, `src/components/dashboard-shell.tsx`, `src/features/dashboard/components/stats-cards.tsx`, `src/app/(dashboard)/users/page.tsx`, `src/features/audit/audit-log-table.tsx`, `src/features/events/attendees-manager.tsx`, `src/features/events/components/events-list.tsx`, `src/features/certificates/certificates-list.tsx`, `src/features/templates/components/template-canvas.tsx`, `src/features/templates/components/template-form.tsx`, `src/features/templates/components/template-sidebar.tsx`, `src/features/templates/components/components-sidebar.tsx`, `src/features/templates/components/email-block-builder-v2/email-block-builder-v2.tsx`, `src/features/templates/components/email-block-builder-v2/block-canvas.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/dropdown-menu.tsx`.

**Forbidden:** new `page.tsx`, new `layout.tsx`, new `route.ts`, new CSS files, server components, API changes.

---

# 10. Risks & Out-of-Scope

- **Template canvas fidelity:** `react-rnd` pixel model cannot be fully finger-accurate via CSS — risk LOW for preview, HIGH for edit; mitigation: scope phones to preview + message, gate full edit to `≥1024px`.
- **Table `data-label`:** `ui/table.tsx` rows lack `data-label` attrs — card `td::before` will show empty unless fallback grid is used; risk LOW (fallback still readable, just no label).
- **Bottom bar fragility:** repurposing `aside` fixed bottom relies on `hasAuthClaim("users.view")` filter (`sidebar.tsx:128`) — if Settings empty, bar still renders correctly but with fewer tabs; test filtered roles.
- **A11y zoom:** removing `maximumScale:1` changes current behavior — intentional per HIG, but verify no layout breaks at 200% zoom.
- **Out-of-scope:** haptics (`navigator.vibrate`), push notifications, PWA install prompt, new navigations, server components.

