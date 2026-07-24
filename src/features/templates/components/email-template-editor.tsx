"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { EMAIL_PLACEHOLDER_FIELDS } from "./email-placeholder-field";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  ListIcon,
  ListOrderedIcon,
  Undo2Icon,
  Redo2Icon,
  EyeIcon,
} from "lucide-react";

interface EmailTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function EmailTemplateEditor({
  value,
  onChange,
  disabled = false,
}: EmailTemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [fontSize, setFontSize] = useState("14");

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start designing your email template...",
      }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
  });

  const insertPlaceholder = useCallback(
    (key: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(`{{${key}}}`).run();
    },
    [editor]
  );

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        `<table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:12px 16px;border:1px solid #e4e4e7;"></td><td style="padding:12px 16px;border:1px solid #e4e4e7;"></td></tr></table>`
      )
      .run();
  }, [editor]);

  const insertButton = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        `<div style="text-align:center;margin:24px 0;"><a href="{{download_url}}" style="display:inline-block;background-color:#18181b;color:#ffffff;padding:14px 36px;text-decoration:none;font-size:14px;font-weight:600;">View Certificate</a></div>`
      )
      .run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("bold")
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Bold"
        >
          <BoldIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("italic")
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Italic"
        >
          <ItalicIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("underline")
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Underline"
        >
          <UnderlineIcon className="size-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive({ textAlign: "left" })
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Align Left"
        >
          <AlignLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive({ textAlign: "center" })
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Align Center"
        >
          <AlignCenterIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive({ textAlign: "right" })
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Align Right"
        >
          <AlignRightIcon className="size-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("bulletList")
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Bullet List"
        >
          <ListIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`rounded-lg p-1.5 transition-colors ${
            editor.isActive("orderedList")
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Ordered List"
        >
          <ListOrderedIcon className="size-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />

        {/* Font Size */}
        <select
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value);
            editor.chain().focus().setMark("textStyle", { fontSize: `${e.target.value}px` }).run();
          }}
          disabled={disabled}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)] disabled:opacity-50"
        >
          <option value="10">10px</option>
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
          <option value="32">32px</option>
        </select>

        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />

        {/* Insert Elements */}
        <button
          type="button"
          onClick={insertTable}
          disabled={disabled}
          className="rounded-lg px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          title="Insert Table"
        >
          Table
        </button>
        <button
          type="button"
          onClick={insertButton}
          disabled={disabled}
          className="rounded-lg px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          title="Insert Button"
        >
          Button
        </button>

        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          title="Undo"
        >
          <Undo2Icon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          title="Redo"
        >
          <Redo2Icon className="size-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />

        {/* Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          disabled={disabled}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
            showPreview
              ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          } disabled:opacity-50`}
          title="Toggle Preview"
        >
          <EyeIcon className="size-4" />
        </button>
      </div>

      {/* Placeholder Insert Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Insert field:</span>
        {EMAIL_PLACEHOLDER_FIELDS.map((field) => (
          <button
            key={field.key}
            type="button"
            onClick={() => insertPlaceholder(field.key)}
            disabled={disabled}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)] disabled:opacity-50"
            title={`Insert {{${field.key}}}`}
          >
            {field.label}
          </button>
        ))}
      </div>

      {/* Editor Content */}
      <div className="min-h-[300px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table_td]:border [&_.ProseMirror_table_td]:border-[var(--color-border)] [&_.ProseMirror_table_td]:p-3"
        />
      </div>
    </div>
  );
}

export function EmailPreview({ html }: { html: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <EyeIcon className="size-4 text-[var(--color-text-muted)]" />
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Email Preview</span>
      </div>
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:16px;font-family:Georgia,'Times New Roman',serif;background:#f4f4f5;}table{max-width:100%;}</style></head><body>${html}</body></html>`}
          className="h-[400px] w-full border-0"
          title="Email Preview"
        />
      </div>
    </div>
  );
}
