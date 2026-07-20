# CRUD Confirmation Modal Pattern

This document describes the iOS-style confirmation modal pattern used for CRUD actions in the e-cert application.

## Overview

All destructive or committing actions (Save, Submit, Add, Edit, Delete, Cancel) should show a confirmation modal before executing. This prevents accidental data loss and gives users a chance to review their actions.

## Components Used

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` from `@/components/ui/dialog`
- `Button` from `@/components/ui/button`
- `InfoIcon` from `lucide-react`

## Pattern for Save/Submit Actions

### State Management

```tsx
const [showSaveConfirm, setShowSaveConfirm] = useState(false);
const [loading, setLoading] = useState(false);
```

### Form Submission Handler

```tsx
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setShowSaveConfirm(true); // Show confirmation instead of immediate save
}

async function confirmSave() {
  setShowSaveConfirm(false);
  setLoading(true);
  
  const result = await onSubmit({ /* form data */ });
  
  if (result?.error) {
    setError(result.error);
    setLoading(false);
  }
}
```

### Modal JSX

```tsx
<Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Save</DialogTitle>
      <DialogDescription>
        Are you sure you want to save these changes?
      </DialogDescription>
    </DialogHeader>
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3 text-sm">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
      <p className="text-[var(--color-info-text)]">
        This will update the template. This action cannot be undone.
      </p>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowSaveConfirm(false)}>
        Cancel
      </Button>
      <Button onClick={confirmSave} disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Pattern for Cancel Actions

### State Management

```tsx
const [showCancelConfirm, setShowCancelConfirm] = useState(false);
```

### Cancel Button Handler

```tsx
function handleCancel() {
  setShowCancelConfirm(true);
}

function confirmCancel() {
  setShowCancelConfirm(false);
  // Navigate away or reset form
  router.push("/templates");
}
```

### Modal JSX

```tsx
<Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Discard Changes?</DialogTitle>
      <DialogDescription>
        You have unsaved changes that will be lost.
      </DialogDescription>
    </DialogHeader>
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
      <p className="text-[var(--color-warning-text)]">
        Any unsaved changes will be reverted. This action cannot be undone.
      </p>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
        Keep Editing
      </Button>
      <Button variant="destructive" onClick={confirmCancel}>
        Discard Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Pattern for Delete Actions

### State Management

```tsx
const [deleteTarget, setDeleteTarget] = useState<ItemType | null>(null);
const [deleting, setDeleting] = useState(false);
```

### Delete Handler

```tsx
async function confirmDelete() {
  if (!deleteTarget) return;
  setDeleting(true);
  
  const result = await deleteAction(deleteTarget.id);
  
  setDeleting(false);
  if (result?.error) {
    alert(result.error);
  } else {
    // Refresh data
    setDeleteTarget(null);
  }
}
```

### Modal JSX

```tsx
<Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Item</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
      </DialogDescription>
    </DialogHeader>
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
      <p className="text-[var(--color-danger-text)]">
        This will permanently delete the item. This action cannot be undone.
      </p>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setDeleteTarget(null)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
        {deleting ? "Deleting..." : "Delete"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Button Styling

### Primary Action (Save/Submit)
```tsx
<Button onClick={confirmSave} disabled={loading}>
  {loading ? "Saving..." : "Save Changes"}
</Button>
```

### Destructive Action (Delete/Discard)
```tsx
<Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
  {deleting ? "Deleting..." : "Delete"}
</Button>
```

### Cancel/Secondary Action
```tsx
<Button variant="outline" onClick={() => setShowConfirm(false)}>
  Cancel
</Button>
```

## Alert Box Styling

### Info (for Save/Submit)
```tsx
<div className="flex items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3 text-sm">
  <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
  <p className="text-[var(--color-info-text)]">
    Description of what will happen...
  </p>
</div>
```

### Warning (for Cancel/Discard)
```tsx
<div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm">
  <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
  <p className="text-[var(--color-warning-text)]">
    Any unsaved changes will be lost...
  </p>
</div>
```

### Danger (for Delete)
```tsx
<div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
  <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
  <p className="text-[var(--color-danger-text)]">
    This will permanently delete...
  </p>
</div>
```

## Example: Template Form Implementation

See `src/features/templates/components/template-form.tsx` for a complete implementation that includes:

1. Save confirmation modal (lines 67-70, 72-88)
2. Cancel confirmation modal (lines 51, 254-268)
3. Fullscreen mode integration (lines 53, 193-198, 254)

## Checklist for New Forms

When creating a new form with CRUD actions, ensure:

- [ ] Save/Submit button shows confirmation modal
- [ ] Cancel button shows "discard changes" confirmation modal
- [ ] Delete buttons show danger confirmation modal
- [ ] Modals use iOS-style styling (rounded-xl, proper colors)
- [ ] Loading states are handled (disable buttons, show "Saving..."/"Deleting...")
- [ ] Error states are handled and displayed
- [ ] Modal can be dismissed by clicking outside or pressing Escape
