"use client";

import { ChevronRightIcon } from "lucide-react";

interface AuthEmailSidebarProps {
  onPreview?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function AuthEmailSidebar({
  onPreview,
  onSave,
  onCancel,
  loading = false,
  disabled = false,
  expanded = true,
  onExpandedChange,
}: AuthEmailSidebarProps) {
  return (
    <div className="flex-shrink-0 flex flex-col">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] flex flex-col min-h-0 flex-shrink-0">
        <button
          type="button"
          onClick={() => onExpandedChange?.(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          Actions
          <ChevronRightIcon className={`size-4 text-[var(--color-text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        {expanded && (
          <div className="px-4 pt-4 pb-4 space-y-2">
            <button
              type="button"
              onClick={onPreview}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] active:scale-[0.97]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              Preview Email
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading || disabled}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-700)] active:scale-[0.97] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] active:scale-[0.97] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
