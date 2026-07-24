"use client";

import { ChevronRightIcon } from "lucide-react";

interface TemplateSidebarProps {
  name: string;
  description: string;
  htmlContent?: string;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
  onPreview?: (html: string, name: string) => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onSave?: () => void;
  onClose?: () => void;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  fullscreen?: boolean;
  showFullscreenToggle?: boolean;
  showPreview?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function TemplateSidebar({
  name,
  description,
  htmlContent = "",
  onNameChange,
  onDescriptionChange,
  onPreview,
  onFullscreenChange,
  onSave,
  onClose,
  submitLabel = "Save Changes",
  loading = false,
  disabled = false,
  fullscreen = false,
  expanded = true,
  onExpandedChange,
}: TemplateSidebarProps) {
  return (
    <div className="flex-shrink-0 flex flex-col">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] flex flex-col min-h-0 flex-shrink-0">
        <button
          type="button"
          onClick={() => onExpandedChange?.(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          Details
          <ChevronRightIcon className={`size-4 text-[var(--color-text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        {expanded && (
          <div className="px-4 pt-4 pb-4 space-y-4">
            <div className="pt-4">
              <label htmlFor="canvas-name" className="block text-xs font-semibold mb-1.5 text-[var(--color-text-secondary)]">
                Template Name
              </label>
              <input
                id="canvas-name"
                type="text"
                value={name}
                onChange={(e) => onNameChange?.(e.target.value)}
                required
                placeholder="e.g. Certificate of Completion"
                className="input text-sm"
              />
            </div>
            <div>
              <label htmlFor="canvas-description" className="block text-xs font-semibold mb-1.5 text-[var(--color-text-secondary)]">
                Description
              </label>
              <textarea
                id="canvas-description"
                value={description}
                onChange={(e) => onDescriptionChange?.(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="input text-sm resize-none"
              />
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onPreview?.(htmlContent, name)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] active:scale-[0.97]"
                title="Preview with sample data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                Preview
              </button>
              {!fullscreen && (
                <button
                  type="button"
                  onClick={() => onFullscreenChange?.(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] active:scale-[0.97]"
                  title="Enter fullscreen mode"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                  Fullscreen
                </button>
              )}
              {fullscreen && (
                <button
                  type="button"
                  onClick={() => onFullscreenChange?.(false)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] active:scale-[0.97]"
                  title="Exit fullscreen (Esc)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                  Exit Fullscreen
                </button>
              )}
              <button
                type="button"
                onClick={onSave}
                disabled={loading || disabled}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-700)] active:scale-[0.97] disabled:opacity-50"
              >
                {loading ? "Saving..." : submitLabel}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] active:scale-[0.97]"
              >
                Close Editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}