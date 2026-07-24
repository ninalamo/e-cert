"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { EmailPreview } from "./email-template-editor";
import { DEFAULT_EMAIL_TEMPLATE } from "./email-placeholder-field";
import dynamic from "next/dynamic";

const EmailBlockBuilder = dynamic(
  () => import("./email-block-builder/email-block-builder").then((m) => m.default),
  { ssr: false }
);
import type { EmailBlockBuilderHandle } from "./email-block-builder";

interface EmailTemplateFormProps {
  initialData?: {
    name: string;
    description: string;
    html_content: string;
    css_content: string;
  };
  onSubmit: (data: {
    name: string;
    description: string;
    type: "email";
    html_content: string;
    css_content: string;
  }) => Promise<{ error?: string }>;
  submitLabel: string;
  disabled?: boolean;
}

export default function EmailTemplateForm({
  initialData,
  onSubmit,
  submitLabel,
  disabled = false,
}: EmailTemplateFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [htmlContent, setHtmlContent] = useState(
    initialData?.html_content ?? DEFAULT_EMAIL_TEMPLATE
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const builderRef = useRef<EmailBlockBuilderHandle | null>(null);

  const handleFullscreenExit = useCallback(() => {
    if (fullscreen) setFullscreen(false);
  }, [fullscreen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleFullscreenExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleFullscreenExit]);

  async function handleSave() {
    setError(null);
    setLoading(true);
    const finalHtml = builderRef.current?.getHtml() ?? htmlContent;
    const result = await onSubmit({
      name,
      description,
      type: "email",
      html_content: finalHtml,
      css_content: "",
    });
    if (result?.error) {
      setError(result.error);
    } else {
      toast.success("Template saved successfully");
    }
    setLoading(false);
  }

  function handleClose() {
    if (window.confirm("Are you sure you want to close? Any unsaved changes will be lost.")) {
      window.location.href = "/templates";
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {error}
        </div>
      )}

      <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
        {/* Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">
              Design your email template. Drag and drop blocks to build your layout, or switch to Editor mode for rich text editing.
            </p>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all"
            >
              Preview
            </button>
          </div>
          <EmailBlockBuilder
            ref={builderRef}
            value={htmlContent}
            onChange={setHtmlContent}
            disabled={disabled}
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            fullscreen={fullscreen}
            onFullscreenChange={setFullscreen}
            submitLabel={submitLabel}
            loading={loading}
            onSave={handleSave}
            onClose={handleClose}
          />
        </div>
      </fieldset>

      {/* Preview Dialog */}
      {showPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
          <div className="mx-4 flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" style={{ width: "600px", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--color-text)]">Email Preview</span>
              <button type="button" onClick={() => setShowPreview(false)} className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(90vh - 60px)" }}>
              <EmailPreview html={htmlContent} />
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-[var(--color-brand-600)] border-t-transparent" />
            <p className="text-sm font-medium text-[var(--color-text)]">Saving changes...</p>
          </div>
        </div>
      )}
    </form>
  );
}
