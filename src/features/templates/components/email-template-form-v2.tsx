import { useState, useRef } from "react";
import { toast } from "sonner";
import EmailBlockBuilderV2 from "./email-block-builder-v2/email-block-builder-v2";
import type { EmailBlockBuilderV2Handle } from "./email-block-builder-v2/email-block-builder-v2";
import { AUTH_PROCESS_LABELS } from "./email-placeholder-field";
import type { AuthProcess } from "@/types/template";

interface EmailTemplateFormV2Props {
  initialData?: {
    name: string;
    description: string;
    html_content: string;
    css_content: string;
    type?: 'email' | 'auth';
    auth_process?: AuthProcess | null;
  };
  onSubmit: (data: {
    name: string;
    description: string;
    html_content: string;
    css_content: string;
    type: 'email' | 'auth';
    auth_process: AuthProcess | null;
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
  const [templateType, setTemplateType] = useState<'email' | 'auth'>(initialData?.type ?? 'email');
  const [authProcess, setAuthProcess] = useState<AuthProcess | null>(initialData?.auth_process ?? null);
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
      type: templateType,
      auth_process: templateType === 'auth' ? authProcess : null,
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
        {/* Template Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-text)]">Template Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="templateType"
                value="email"
                checked={templateType === 'email'}
                onChange={() => { setTemplateType('email'); setAuthProcess(null); }}
                disabled={disabled}
                className="h-4 w-4"
              />
              <span className="text-sm text-[var(--color-text)]">Regular (Event Email)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="templateType"
                value="auth"
                checked={templateType === 'auth'}
                onChange={() => setTemplateType('auth')}
                disabled={disabled}
                className="h-4 w-4"
              />
              <span className="text-sm text-[var(--color-text)]">Auth (Authentication Email)</span>
            </label>
          </div>
        </div>

        {/* Auth Process Selector */}
        {templateType === 'auth' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text)]">Auth Process</label>
            <select
              value={authProcess ?? ''}
              onChange={(e) => setAuthProcess(e.target.value as AuthProcess || null)}
              disabled={disabled}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            >
              <option value="">Select an auth process...</option>
              {Object.entries(AUTH_PROCESS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--color-text-muted)]">
              Each auth process can only have one template. If no template is set, the default hardcoded email will be used.
            </p>
          </div>
        )}

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