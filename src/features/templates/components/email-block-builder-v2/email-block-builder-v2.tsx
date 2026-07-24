"use client";

import { useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import type { EmailBlockType, AnyEmailBlock } from "./types";
import {
  uid,
  createBlock,
  blocksToHtml,
} from "./block-definitions";
import BlockCanvas from "./block-canvas";
import BlockProperties from "./block-properties";
import { BLOCK_TYPE_ICONS, BLOCK_COLORS } from "./block-definitions";
import { EMAIL_PLACEHOLDER_FIELDS } from "./types";
import {
  GripVerticalIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  LockOpenIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  Undo2Icon,
  Redo2Icon,
} from "lucide-react";
import TemplateSidebar from "../template-sidebar";
import ComponentsSidebar, { ComponentsSidebarItem } from "../components-sidebar";

interface EmailBlockBuilderV2Props {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  name?: string;
  description?: string;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (desc: string) => void;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  submitLabel?: string;
  loading?: boolean;
  onSave?: () => void;
  onPreview?: () => void;
}

interface EmailBlockBuilderV2Handle {
  getHtml: () => string;
  getBlocks: () => AnyEmailBlock[];
}

function moveArrayItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function insertBlockAt(blocks: AnyEmailBlock[], type: EmailBlockType, index: number): AnyEmailBlock[] {
  const newBlock = createBlock(type);
  const result = [...blocks];
  result.splice(index, 0, newBlock);
  return result;
}

function duplicateBlock(blocks: AnyEmailBlock[], id: string): AnyEmailBlock[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index === -1) return blocks;
  const original = blocks[index];
  const copy: AnyEmailBlock = {
    ...original,
    id: uid(),
    props: { ...original.props },
  };
  const result = [...blocks];
  result.splice(index + 1, 0, copy);
  return result;
}

function deleteBlock(blocks: AnyEmailBlock[], id: string): AnyEmailBlock[] {
  return blocks.filter((b) => b.id !== id);
}

function toggleBlockHidden(blocks: AnyEmailBlock[], id: string): AnyEmailBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b));
}

function toggleBlockLocked(blocks: AnyEmailBlock[], id: string): AnyEmailBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b));
}

function updateBlockProps(blocks: AnyEmailBlock[], id: string, props: Record<string, unknown>): AnyEmailBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } : b));
}

function moveBlockUp(blocks: AnyEmailBlock[], index: number): AnyEmailBlock[] {
  if (index <= 0) return blocks;
  return moveArrayItem(blocks, index, index - 1);
}

function moveBlockDown(blocks: AnyEmailBlock[], index: number): AnyEmailBlock[] {
  if (index >= blocks.length - 1) return blocks;
  return moveArrayItem(blocks, index, index + 1);
}

const MAX_HISTORY = 50;

const EmailBlockBuilderV2 = forwardRef<EmailBlockBuilderV2Handle, EmailBlockBuilderV2Props>(
  function EmailBlockBuilderV2(
    {
      value,
      onChange,
      disabled,
      name = "",
      description = "",
      onNameChange,
      onDescriptionChange,
      onPreview,
      fullscreen = false,
      onFullscreenChange,
      submitLabel = "Save Changes",
      loading = false,
      onSave,
    },
    ref
  ) {
    const [blocks, setBlocks] = useState<AnyEmailBlock[]>(() => {
      if (!value || !value.trim()) return [];
      return [];
    });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [history, setHistory] = useState<AnyEmailBlock[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [templateSidebarExpanded, setTemplateSidebarExpanded] = useState(true);
    const [componentsExpanded, setComponentsExpanded] = useState(true);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropSide, setDropSide] = useState<"before" | "after">("before");

    const pushHistory = useCallback(
      (newBlocks: AnyEmailBlock[]) => {
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
      (newBlocks: AnyEmailBlock[], recordHistory = true) => {
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
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setDropSide(e.clientY < midY ? "before" : "after");
    }, []);

    const handleListDrop = useCallback(
      (targetId: string) => {
        if (!draggedId || draggedId === targetId) return;
        const fromIndex = blocks.findIndex((b) => b.id === draggedId);
        const toIndex = blocks.findIndex((b) => b.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return;
        const insertIndex = dropSide === "before" ? toIndex : toIndex + 1;
        const newBlocks = moveArrayItem(blocks, fromIndex, insertIndex);
        updateBlocks(newBlocks);
        setDraggedId(null);
        setDragOverId(null);
      },
      [blocks, draggedId, updateBlocks, dropSide]
    );

    const handleListDragEnd = useCallback(() => {
      setDraggedId(null);
      setDragOverId(null);
      setDropSide("before");
    }, []);

    const handleListMove = useCallback(
      (fromIndex: number, toIndex: number) => {
        const newBlocks = moveArrayItem(blocks, fromIndex, toIndex);
        updateBlocks(newBlocks);
      },
      [blocks, updateBlocks]
    );

    const handleListItemClick = useCallback(
      (id: string, e: React.MouseEvent) => {
        if (e.detail === 2) return;
        setSelectedId(selectedId === id ? null : id);
      },
      [selectedId]
    );

    const handleBlockDragStart = useCallback(
      (index: number, e: React.DragEvent) => {
        if (disabled) return;
        e.dataTransfer.setData("application/email-block-reorder", String(index));
        e.dataTransfer.effectAllowed = "move";
        setDraggedId(blocks[index].id);
      },
      [disabled, blocks]
    );

    const handleBlockDragOver = useCallback(
      (index: number, e: React.DragEvent) => {
        if (disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = draggedId ? "move" : "copy";
        setDragOverId(blocks[index].id);
      },
      [disabled, draggedId, blocks]
    );

    const handleBlockDrop = useCallback(
      (index: number, e: React.DragEvent) => {
        e.preventDefault();
        if (disabled) return;

        const reorderIndex = e.dataTransfer.getData("application/email-block-reorder");
        const newBlockType = e.dataTransfer.getData("application/email-block-type") as EmailBlockType;

        if (reorderIndex !== "") {
          const from = parseInt(reorderIndex, 10);
          if (!isNaN(from) && from !== index) {
            handleMoveBlock(from, index > from ? index - 1 : index);
          }
        } else if (newBlockType) {
          handleInsertBlock(newBlockType, index);
        }

        setDragOverId(null);
        setDraggedId(null);
      },
      [disabled, handleMoveBlock, handleInsertBlock]
    );

    const handleBlockDragEnd = useCallback(() => {
      setDragOverId(null);
      setDraggedId(null);
    }, []);

    const handleCanvasDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        if (disabled) return;

        const newBlockType = e.dataTransfer.getData("application/email-block-type") as EmailBlockType;
        if (newBlockType) {
          handleInsertBlock(newBlockType, blocks.length);
        }
        setDragOverId(null);
        setDraggedId(null);
      },
      [disabled, blocks.length, handleInsertBlock]
    );

    const handleCanvasDragOver = useCallback(
      (e: React.DragEvent) => {
        if (disabled) return;
        e.preventDefault();
        if (draggedId === null) {
          setDragOverId("canvas-end");
        }
      },
      [disabled, draggedId]
    );

    const handleSidebarDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        if (disabled) return;
        const newBlockType = e.dataTransfer.getData("application/email-block-type") as EmailBlockType;
        if (newBlockType) {
          handleInsertBlock(newBlockType, blocks.length);
        }
      },
      [disabled, blocks.length, handleInsertBlock]
    );

    const selectedBlock = useMemo(
      () => blocks.find((b) => b.id === selectedId) ?? null,
      [blocks, selectedId]
    );

    const componentItems: ComponentsSidebarItem[] = blocks.map((block, index) => ({
      id: block.id,
      type: block.type,
      label: getBlockLabel(block),
      icon: BLOCK_TYPE_ICONS[block.type],
      color: BLOCK_COLORS[block.type],
      hidden: block.hidden,
      locked: block.locked,
    }));

    const paletteItems: { type: EmailBlockType; label: string; icon: string; color: string }[] = [
      { type: "header", label: "Header", icon: "H", color: "text-blue-700 bg-blue-50" },
      { type: "text", label: "Text", icon: "T", color: "text-zinc-700 bg-zinc-50" },
      { type: "image", label: "Image", icon: "I", color: "text-emerald-700 bg-emerald-50" },
      { type: "button", label: "Button", icon: "B", color: "text-violet-700 bg-violet-50" },
      { type: "divider", label: "Divider", icon: "---", color: "text-orange-600 bg-orange-50" },
      { type: "spacer", label: "Spacer", icon: "⋮", color: "text-slate-500 bg-slate-50" },
      { type: "columns", label: "Columns", icon: "||", color: "text-cyan-700 bg-cyan-50" },
      { type: "table", label: "Table", icon: "⊞", color: "text-amber-700 bg-amber-50" },
    ];

    useImperativeHandle(
      ref,
      () => ({
        getHtml: () => blocksToHtml(blocks),
        getBlocks: () => blocks,
      }),
      [blocks]
    );

    return (
      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Sidebar collapse toggle */}
        <button
          type="button"
          onClick={() => setSidebarExpanded((v) => !v)}
          className="self-start mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-text-muted)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronDownIcon className={`size-4 transition-transform ${sidebarExpanded ? "rotate-180" : ""}`} />
        </button>

        {/* Left sidebar */}
        {sidebarExpanded && (
          <div className="w-64 flex-shrink-0 flex flex-col gap-4 max-h-full overflow-y-auto">
<TemplateSidebar
                name={name}
                description={description}
                onNameChange={onNameChange}
                onDescriptionChange={onDescriptionChange}
                onPreview={onPreview}
                onFullscreenChange={onFullscreenChange}
                onSave={onSave}
                onClose={() => onFullscreenChange?.(false)}
                submitLabel={submitLabel}
                loading={loading}
                disabled={disabled}
                fullscreen={fullscreen}
                expanded={templateSidebarExpanded}
                onExpandedChange={setTemplateSidebarExpanded}
              />
              <ComponentsSidebar
               items={componentItems}
               expanded={componentsExpanded}
               onExpandedChange={() => setComponentsExpanded((v) => !v)}
               selectedId={selectedId}
               onSelect={handleListItemClick}
               onReorder={handleListMove}
               onToggleHidden={handleToggleHidden}
               onToggleLocked={handleToggleLocked}
               onDelete={handleDeleteBlock}
               onDragStart={handleListDragStart}
               onDragOver={handleListDragOver}
               onDrop={handleListDrop}
               onDragEnd={handleListDragEnd}
               onDragLeave={() => { if (dragOverId) setDragOverId(null); }}
               disabled={disabled}
               dragOverId={dragOverId}
               draggedId={draggedId}
               dropSide={dropSide}
               emptyMessage="No components yet"
               title="Components"
             />
          </div>
        )}

        {/* Center: Toolbar + Canvas */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          {/* Toolbar */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] overflow-hidden">
            <div className="flex items-center gap-1 px-1.5 py-1 flex-wrap">
              {/* Add block buttons */}
              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                {paletteItems.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddBlock(item.type)}
                    disabled={disabled}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${item.color} transition-all hover:brightness-105 active:scale-[0.97] disabled:opacity-40`}
                    title={`Add ${item.label} block`}
                  >
                    <span className="text-[10px] font-bold">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              {/* Undo/Redo */}
              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button type="button" onClick={undo} disabled={historyIndex <= 0} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Undo (Ctrl+Z)"><Undo2Icon className="size-3.5" /></button>
                <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Redo (Ctrl+Shift+Z)"><Redo2Icon className="size-3.5" /></button>
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              {/* Placeholder insert buttons */}
              <div className="flex items-center gap-0.5 flex-wrap">
                {EMAIL_PLACEHOLDER_FIELDS.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    disabled={disabled || !selectedBlock || selectedBlock.type !== "text"}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)] disabled:opacity-50"
                    title={`Insert {{${field.key}}}}`}
                    onClick={() => {
                      if (!selectedBlock || selectedBlock.type !== "text") return;
                      const p = selectedBlock.props as { content: string };
                      handleUpdateProps(selectedBlock.id, { content: p.content + `{{${field.key}}}` });
                    }}
                  >
                    {field.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Preview button */}
              <button
                type="button"
                onClick={onPreview}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all"
              >
                Preview
              </button>

              {/* Fullscreen button */}
              <button
                type="button"
                onClick={() => onFullscreenChange?.(!fullscreen)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] transition-all"
              >
                {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>

              {/* Save button */}
              <button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="rounded-lg bg-[var(--color-brand-600)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-700)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : submitLabel}
              </button>

              {/* Close Editor button */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to close? Any unsaved changes will be lost.")) {
                    window.location.href = "/templates";
                  }
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)] transition-all"
              >
                Close Editor
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[#e5e7eb] p-6 flex justify-center min-h-0">
            <div className="w-full max-w-[600px] bg-white rounded-lg shadow-lg border border-[var(--color-border)]">
              {/* Email Header Bar */}
              <div className="border-b border-[var(--color-border)] bg-[#fafafa] rounded-t-lg px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                </div>
                <div className="flex-1 text-center text-[10px] text-[var(--color-text-muted)] font-medium">Email Preview (600px)</div>
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
          <div className="w-64 flex-shrink-0 max-h-full overflow-y-auto">
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

function isPlaceholderBlock(block: AnyEmailBlock): boolean {
  if (block.type !== "text") return false;
  const text = (block.props as { content: string }).content.replace(/<[^>]*>/g, "").trim();
  return /^\{\{.+\}\}$/.test(text);
}

function getBlockLabel(block: AnyEmailBlock): string {
  switch (block.type) {
    case "header":
      return (block.props as { text: string }).text || "Header";
    case "text": {
      const text = (block.props as { content: string }).content.replace(/<[^>]*>/g, "").trim();
      return text.slice(0, 20) + (text.length > 20 ? "..." : "") || "Text";
    }
    case "image":
      return (block.props as { alt: string }).alt || "Image";
    case "button":
      return (block.props as { text: string }).text || "Button";
    case "divider":
      return "Divider";
    case "spacer":
      return `${(block.props as { height: number }).height}px`;
    case "columns":
      return `${(block.props as { columnCount: number }).columnCount} Columns`;
    default:
      return block.type;
  }
}

export default EmailBlockBuilderV2;
export type { EmailBlockBuilderV2Props, EmailBlockBuilderV2Handle };