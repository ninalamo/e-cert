"use client";

import { useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import type { EmailBlock, EmailBlockType } from "./types";
import {
  uid,
  createBlock,
  blocksToHtml,
} from "./block-definitions";
import BlockCanvas from "./block-canvas";
import BlockProperties from "./block-properties";
import { EMAIL_PLACEHOLDER_FIELDS } from "../email-placeholder-field";
import {
  Undo2Icon,
  Redo2Icon,
  ChevronDownIcon,
  GripVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  LockOpenIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";

interface EmailBlockBuilderProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  name?: string;
  description?: string;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (desc: string) => void;
  fullscreen?: boolean;
  onFullscreenChange?: (fs: boolean) => void;
  submitLabel?: string;
  loading?: boolean;
  onSave?: () => void;
  onClose?: () => void;
}

export interface EmailBlockBuilderHandle {
  getHtml: () => string;
  getBlocks: () => EmailBlock[];
}

function moveArrayItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function insertBlockAt(blocks: EmailBlock[], type: EmailBlockType, index: number): EmailBlock[] {
  const newBlock = createBlock(type);
  const result = [...blocks];
  result.splice(index, 0, newBlock);
  return result;
}

function duplicateBlock(blocks: EmailBlock[], id: string): EmailBlock[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index === -1) return blocks;
  const original = blocks[index];
  const copy: EmailBlock = {
    ...original,
    id: uid(),
    props: { ...original.props },
  };
  const result = [...blocks];
  result.splice(index + 1, 0, copy);
  return result;
}

function deleteBlock(blocks: EmailBlock[], id: string): EmailBlock[] {
  return blocks.filter((b) => b.id !== id);
}

function toggleBlockHidden(blocks: EmailBlock[], id: string): EmailBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b));
}

function toggleBlockLocked(blocks: EmailBlock[], id: string): EmailBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b));
}

function updateBlockProps(blocks: EmailBlock[], id: string, props: Record<string, unknown>): EmailBlock[] {
  return blocks.map((b) =>
    b.id === id ? { ...b, props: { ...b.props, ...props } } : b
  );
}

function moveBlockUp(blocks: EmailBlock[], index: number): EmailBlock[] {
  if (index <= 0) return blocks;
  return moveArrayItem(blocks, index, index - 1);
}

function moveBlockDown(blocks: EmailBlock[], index: number): EmailBlock[] {
  if (index >= blocks.length - 1) return blocks;
  return moveArrayItem(blocks, index, index + 1);
}

const MAX_HISTORY = 50;

const EmailBlockBuilder = forwardRef<EmailBlockBuilderHandle, EmailBlockBuilderProps>(
  function EmailBlockBuilder(
    {
      value,
      onChange,
      disabled,
      name = "",
      description = "",
      onNameChange,
      onDescriptionChange,
      fullscreen = false,
      onFullscreenChange,
      submitLabel = "Save Changes",
      loading = false,
      onSave,
      onClose,
    },
    ref
  ) {
    const [blocks, setBlocks] = useState<EmailBlock[]>(() => parseInitialBlocks(value));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [history, setHistory] = useState<EmailBlock[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [componentsExpanded, setComponentsExpanded] = useState(true);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const pushHistory = useCallback(
      (newBlocks: EmailBlock[]) => {
        setHistory((prev) => {
          const trimmed = prev.slice(0, historyIndex + 1);
          const next = [...trimmed, newBlocks];
          if (next.length > MAX_HISTORY) next.shift();
          return next;
        });
        setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
      },
      [historyIndex]
    );

    const updateBlocks = useCallback(
      (newBlocks: EmailBlock[], recordHistory = true) => {
        setBlocks(newBlocks);
        if (recordHistory) pushHistory(newBlocks);
        onChange(blocksToHtml(newBlocks));
      },
      [onChange, pushHistory]
    );

    const undo = useCallback(() => {
      if (historyIndex <= 0) return;
      const prev = history[historyIndex - 1];
      setBlocks(prev);
      setHistoryIndex((i) => i - 1);
      onChange(blocksToHtml(prev));
    }, [history, historyIndex, onChange]);

    const redo = useCallback(() => {
      if (historyIndex >= history.length - 1) return;
      const next = history[historyIndex + 1];
      setBlocks(next);
      setHistoryIndex((i) => i + 1);
      onChange(blocksToHtml(next));
    }, [history, historyIndex, onChange]);

    const handleAddBlock = useCallback(
      (type: EmailBlockType) => {
        const newBlocks = insertBlockAt(blocks, type, blocks.length);
        updateBlocks(newBlocks);
        setSelectedId(newBlocks[newBlocks.length - 1].id);
      },
      [blocks, updateBlocks]
    );

    const handleMoveBlock = useCallback(
      (fromIndex: number, toIndex: number) => {
        const newBlocks = moveArrayItem(blocks, fromIndex, toIndex);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleInsertBlock = useCallback(
      (type: EmailBlockType, atIndex: number) => {
        const newBlocks = insertBlockAt(blocks, type, atIndex);
        updateBlocks(newBlocks);
        setSelectedId(newBlocks[atIndex].id);
      },
      [blocks, updateBlocks]
    );

    const handleDuplicateBlock = useCallback(
      (id: string) => {
        const newBlocks = duplicateBlock(blocks, id);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleDeleteBlock = useCallback(
      (id: string) => {
        const newBlocks = deleteBlock(blocks, id);
        updateBlocks(newBlocks);
        if (selectedId === id) setSelectedId(null);
      },
      [blocks, selectedId, updateBlocks]
    );

    const handleToggleHidden = useCallback(
      (id: string) => {
        const newBlocks = toggleBlockHidden(blocks, id);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleToggleLocked = useCallback(
      (id: string) => {
        const newBlocks = toggleBlockLocked(blocks, id);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleUpdateProps = useCallback(
      (id: string, props: Record<string, unknown>) => {
        const newBlocks = updateBlockProps(blocks, id, props);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleListMoveUp = useCallback(
      (index: number) => {
        const newBlocks = moveBlockUp(blocks, index);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleListMoveDown = useCallback(
      (index: number) => {
        const newBlocks = moveBlockDown(blocks, index);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleListDragStart = useCallback((id: string, e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
      setDraggedId(id);
    }, []);

    const handleListDragOver = useCallback((id: string, e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverId(id);
    }, []);

    const handleListDrop = useCallback(
      (targetId: string) => {
        if (!draggedId || draggedId === targetId) return;
        const fromIndex = blocks.findIndex((b) => b.id === draggedId);
        const toIndex = blocks.findIndex((b) => b.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return;
        const newBlocks = moveArrayItem(blocks, fromIndex, toIndex);
        updateBlocks(newBlocks);
        setDraggedId(null);
        setDragOverId(null);
      },
      [blocks, draggedId, updateBlocks]
    );

    const handleListDragEnd = useCallback(() => {
      setDraggedId(null);
      setDragOverId(null);
    }, []);

    const handleListItemClick = useCallback(
      (id: string, e: React.MouseEvent) => {
        if (e.detail === 2) return;
        setSelectedId(selectedId === id ? null : id);
      },
      [selectedId]
    );

    const selectedBlock = useMemo(
      () => blocks.find((b) => b.id === selectedId) ?? null,
      [blocks, selectedId]
    );

    useImperativeHandle(
      ref,
      () => ({
        getHtml: () => blocksToHtml(blocks),
        getBlocks: () => blocks,
      }),
      [blocks]
    );

    return (
      <div className={`flex gap-4 ${fullscreen ? "fixed inset-0 z-50 bg-[var(--color-surface)] p-4" : ""}`}>
        {/* Sidebar collapse toggle */}
        <button
          type="button"
          onClick={() => setSidebarExpanded((v) => !v)}
          className="self-start mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-text-muted)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronDownIcon className={`size-4 transition-transform ${sidebarExpanded ? "" : "-rotate-90"}`} />
        </button>

        {/* Left sidebar */}
        {sidebarExpanded && (
          <div className="w-64 flex-shrink-0 flex flex-col gap-4 max-h-[calc(100vh-220px)] overflow-y-auto">
            {/* Template Info */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] flex-shrink-0">
              <button
                type="button"
                onClick={() => setSidebarExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                Template
                <ChevronDownIcon className={`size-4 text-[var(--color-text-muted)] transition-transform ${sidebarExpanded ? "rotate-180" : ""}`} />
              </button>
              {sidebarExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <div>
                    <label htmlFor="template-name" className="block text-xs font-semibold mb-1.5 text-[var(--color-text-secondary)]">
                      Template Name
                    </label>
                    <input
                      id="template-name"
                      type="text"
                      value={name}
                      onChange={(e) => onNameChange?.(e.target.value)}
                      required
                      placeholder="e.g. Certificate Issued Notification"
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="template-description" className="block text-xs font-semibold mb-1.5 text-[var(--color-text-secondary)]">
                      Description
                    </label>
                    <textarea
                      id="template-description"
                      value={description}
                      onChange={(e) => onDescriptionChange?.(e.target.value)}
                      placeholder="Optional description"
                      rows={3}
                      className="input text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-2">
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

            {/* Components List */}
            <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] flex flex-col min-h-0">
              <button
                type="button"
                onClick={() => setComponentsExpanded((v) => !v)}
                className="w-full border-b border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between flex-shrink-0 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  Components
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">{blocks.length}</span>
                  <ChevronDownIcon
                    className={`size-4 text-[var(--color-text-muted)] transition-transform ${
                      componentsExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>
              {componentsExpanded && (
                <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-[var(--color-border)]">
                  {blocks.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                      No components yet
                    </p>
                  ) : (
                    blocks.map((block, index) => (
                      <div
                        key={block.id}
                        className={`flex items-center gap-1.5 px-2 py-2 text-xs cursor-pointer transition-all select-none ${
                          block.hidden ? "opacity-40" : ""
                        } ${
                          dragOverId === block.id && draggedId !== block.id
                            ? "border-t-2 border-t-[var(--color-brand-500)]"
                            : ""
                        } ${draggedId === block.id ? "opacity-30" : ""} ${
                          selectedId === block.id
                            ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                        }`}
                        draggable
                        onDragStart={(e) => handleListDragStart(block.id, e)}
                        onDragOver={(e) => handleListDragOver(block.id, e)}
                        onDrop={() => handleListDrop(block.id)}
                        onDragEnd={handleListDragEnd}
                        onDragLeave={() => { if (dragOverId === block.id) setDragOverId(null); }}
                        onClick={(e) => handleListItemClick(block.id, e)}
                      >
                        <span className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                          <GripVerticalIcon className="size-3" />
                        </span>
                        <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${getBlockTypeColor(block.type)}`}>
                          {getBlockTypeIcon(block.type)}
                        </span>
                        <span className="truncate flex-1">{getBlockLabelShort(block)}</span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleListMoveUp(index); }}
                            disabled={index === 0 || disabled}
                            className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)] disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUpIcon className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleListMoveDown(index); }}
                            disabled={index === blocks.length - 1 || disabled}
                            className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)] disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDownIcon className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleHidden(block.id); }}
                            disabled={disabled}
                            className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)]"
                            title={block.hidden ? "Show" : "Hide"}
                          >
                            {block.hidden ? <EyeOffIcon className="size-3" /> : <EyeIcon className="size-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleLocked(block.id); }}
                            disabled={disabled}
                            className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)]"
                            title={block.locked ? "Unlock" : "Lock"}
                          >
                            {block.locked ? <LockIcon className="size-3" /> : <LockOpenIcon className="size-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                            disabled={disabled}
                            className="rounded p-0.5 hover:bg-[var(--color-danger-bg)]"
                            title="Delete"
                          >
                            <Trash2Icon className="size-3 text-[var(--color-text-muted)] hover:text-[var(--color-danger-text)]" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center: Toolbar + Canvas */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          {/* Toolbar */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] overflow-hidden">
            <div className="flex items-center gap-1 px-1.5 py-1 flex-wrap">
              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button type="button" onClick={() => handleAddBlock("header")} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-50 active:scale-[0.97]" title="Add header block">
                  <span className="text-[10px] font-bold">H</span> Header
                </button>
                <button type="button" onClick={() => handleAddBlock("text")} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-[0.97]" title="Add text block">
                  <span className="text-[10px] font-bold">T</span> Text
                </button>
                <button type="button" onClick={() => handleAddBlock("image")} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.97]" title="Add image block">
                  <span className="text-[10px] font-bold">I</span> Image
                </button>
                <button type="button" onClick={() => handleAddBlock("button")} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition-all hover:bg-violet-50 active:scale-[0.97]" title="Add button block">
                  <span className="text-[10px] font-bold">B</span> Button
                </button>
                <button type="button" onClick={() => handleAddBlock("divider")} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-orange-600 transition-all hover:bg-orange-50 active:scale-[0.97]" title="Add divider block">
                  ---
                </button>
                <button type="button" onClick={() => handleAddBlock("spacer")} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 active:scale-[0.97]" title="Add spacer block">
                  ↕ Spacer
                </button>
                <button type="button" onClick={() => handleAddBlock("columns")} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-cyan-700 transition-all hover:bg-cyan-50 active:scale-[0.97]" title="Add columns block">
                  || Cols
                </button>
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button
                  type="button"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2Icon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2Icon className="size-3.5" />
                </button>
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              {/* Placeholder insert buttons */}
              <div className="flex items-center gap-0.5 flex-wrap">
                {EMAIL_PLACEHOLDER_FIELDS.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    disabled={disabled}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)] disabled:opacity-50"
                    title={`Insert {{${field.key}}}`}
                    onClick={() => {
                      if (!selectedBlock || selectedBlock.type !== "text") return;
                      const p = selectedBlock.props as import("./types").TextBlockProps;
                      handleUpdateProps(selectedBlock.id, { content: p.content + `{{${field.key}}}` });
                    }}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[#e5e7eb] p-6 flex justify-center min-h-[500px]">
            <div className="w-full max-w-[600px] bg-white rounded-lg shadow-lg border border-[var(--color-border)]">
              {/* Email Header Bar */}
              <div className="border-b border-[var(--color-border)] bg-[#fafafa] rounded-t-lg px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                </div>
                <div className="flex-1 text-center text-[10px] text-[var(--color-text-muted)] font-medium">
                  Email Preview
                </div>
              </div>

              {/* Block Canvas */}
              <div className="p-4 min-h-[450px]">
                <BlockCanvas
                  blocks={blocks}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onMoveBlock={handleMoveBlock}
                  onInsertBlock={handleInsertBlock}
                  onDuplicateBlock={handleDuplicateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onToggleHidden={handleToggleHidden}
                  onToggleLocked={handleToggleLocked}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Properties panel */}
        {selectedBlock && (
          <div className="w-64 flex-shrink-0 max-h-[calc(100vh-220px)] overflow-y-auto">
            <BlockProperties
              block={selectedBlock}
              onUpdate={(props) => handleUpdateProps(selectedBlock.id, props)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    );
  }
);

function getBlockTypeColor(type: EmailBlockType): string {
  switch (type) {
    case "header": return "bg-blue-100 text-blue-700";
    case "text": return "bg-zinc-100 text-zinc-700";
    case "image": return "bg-emerald-100 text-emerald-700";
    case "button": return "bg-violet-100 text-violet-700";
    case "divider": return "bg-orange-100 text-orange-600";
    case "spacer": return "bg-slate-100 text-slate-500";
    case "columns": return "bg-cyan-100 text-cyan-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function getBlockTypeIcon(type: EmailBlockType): string {
  switch (type) {
    case "header": return "H";
    case "text": return "T";
    case "image": return "I";
    case "button": return "B";
    case "divider": return "---";
    case "spacer": return "↕";
    case "columns": return "||";
    default: return "?";
  }
}

function getBlockLabelShort(block: EmailBlock): string {
  switch (block.type) {
    case "header":
      return (block.props as import("./types").HeaderBlockProps).text.slice(0, 20) || "Header";
    case "text": {
      const text = (block.props as import("./types").TextBlockProps).content.replace(/<[^>]*>/g, "").trim();
      return text.slice(0, 20) + (text.length > 20 ? "..." : "") || "Text";
    }
    case "image":
      return (block.props as import("./types").ImageBlockProps).alt || "Image";
    case "button":
      return (block.props as import("./types").ButtonBlockProps).text || "Button";
    case "divider":
      return "Divider";
    case "spacer":
      return `${(block.props as import("./types").SpacerBlockProps).height}px`;
    case "columns":
      return `${(block.props as import("./types").ColumnsBlockProps).columnCount} cols`;
    default:
      return block.type;
  }
}

function parseInitialBlocks(html: string): EmailBlock[] {
  if (!html || !html.trim()) return [];
  return [];
}

export default EmailBlockBuilder;
