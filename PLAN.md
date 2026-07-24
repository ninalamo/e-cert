# Email Template Editor - Streamlined Block Builder Plan

## Overview
Replace the existing block builder (`email-block-builder/`) with a new streamlined version (`email-block-builder-v2/`) that:
- Uses fixed 600px email container (not canvas with absolute positioning)
- Lightweight sidebar + properties panel structure
- Placeholder dropdown in block properties
- Modal preview
- Used by both new and edit email template pages

## Implementation Steps

### 1. Create New Block Builder Components (`email-block-builder-v2/`)
- [x] `types.ts` - Type definitions for email blocks
- [x] `block-definitions.ts` - Default props, HTML generation, createBlock, etc.
- [x] `block-canvas.tsx` - Canvas with drag/drop, block previews
- [x] `block-properties.tsx` - Properties panel for selected block
- [x] `email-block-builder-v2.tsx` - Main builder component (orchestrates canvas + sidebar + properties)
- [x] `index.ts` - Exports

### 2. Create New Email Template Form
- [x] `email-template-form-v2.tsx` - Form using the new block builder
  - Template name/description fields
  - Block builder integration
  - Modal preview
  - Save/close handling

### 3. Update Pages
- [x] `src/app/(dashboard)/templates/email/new/page.tsx` - Use new form
- [x] `src/app/(dashboard)/templates/email/[id]/edit-email-template-form.tsx` - Use new form

### 4. Cleanup (Optional)
- [ ] Remove old `email-block-builder/` and `email-template-form.tsx` if no longer used

## Key Design Decisions

| Aspect | Decision |
|--------|----------|
| Editor variant | Block Builder (Drag & Drop) - simplified |
| Page size | Fixed 600px email container (standard email width) |
| Scope | Replace block builder in both new & edit email pages |
| Placeholder insertion | Dropdown in block properties panel |
| Preview | Modal/dialog preview |
| Simplification | Lightweight - keep sidebar + properties, cleaner UI |

## File Structure
```
src/features/templates/components/
├── email-block-builder-v2/
│   ├── index.ts
│   ├── types.ts
│   ├── block-definitions.ts
│   ├── block-canvas.tsx
│   ├── block-properties.tsx
│   └── email-block-builder-v2.tsx
├── email-template-form-v2.tsx
└── (old files to potentially remove)
    ├── email-block-builder/
    └── email-template-form.tsx
```