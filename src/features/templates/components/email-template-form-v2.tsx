import { useState, useRef } from "react";
import { toast } from "sonner";
import EmailBlockBuilderV2 from "./email-block-builder-v2/email-block-builder-v2";
import type { EmailBlockBuilderV2Handle } from "./email-block-builder-v2/email-block-builder-v2";

interface EmailTemplateFormV2Props {
  initialData?: {
    name: string;
    description: string;
    html_content: string;
    css_content: string;
  };
  onSubmit: (data: {
    name: string;
    description: string;
    html_content: string;
    css_content: string;
  }) => Promise<{ error?: string }>;
  submitLabel: string;
  disabled?: boolean;
  onPreview?: (html: string, name: string) => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onClose?: () => void;
  fullscreen?: boolean;
}

export default function EmailTemplateFormV2({
  initialData,
  onSubmit,
  submitLabel,
  disabled = false,
  onPreview,
  onFullscreenChange,
  onClose,
  fullscreen = false,
}: EmailTemplateFormV2Props) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [htmlContent, setHtmlContent] = useState(initialData?.html_content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const builderRef = useRef<EmailBlockBuilderV2Handle | null>(null);

  async function handleSave() {
    setError(null);
    setLoading(true);
    const finalHtml = builderRef.current?.getHtml() ?? htmlContent;
    const result = await onSubmit({
      name,
      description,
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
          </div>
          <EmailBlockBuilderV2
            ref={builderRef}
            value={htmlContent}
            onChange={setHtmlContent}
            disabled={disabled}
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            submitLabel={submitLabel}
            loading={loading}
            onSave={handleSave}
            onPreview={() => onPreview?.(htmlContent, name)}
            onFullscreenChange={onFullscreenChange}
            onClose={onClose}
            fullscreen={fullscreen}
          />
        </div>
      </fieldset>

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