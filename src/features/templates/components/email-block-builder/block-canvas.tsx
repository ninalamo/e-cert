"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { EmailBlock, EmailBlockType } from "./types";
import {
  getBlockLabel,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_ICONS,
} from "./block-definitions";
import {
  GripVerticalIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  LockOpenIcon,
  CopyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";

interface BlockCanvasProps {
  blocks: EmailBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
  onInsertBlock: (type: EmailBlockType, atIndex: number) => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  disabled?: boolean;
}

const BLOCK_COLORS: Record<EmailBlockType, string> = {
  header: "bg-blue-100 text-blue-700 border-blue-200",
  text: "bg-zinc-100 text-zinc-700 border-zinc-200",
  image: "bg-emerald-100 text-emerald-700 border-emerald-200",
  button: "bg-violet-100 text-violet-700 border-violet-200",
  divider: "bg-orange-50 text-orange-600 border-orange-200",
  spacer: "bg-slate-50 text-slate-400 border-slate-200",
  columns: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export default function BlockCanvas({
  blocks,
  selectedId,
  onSelect,
  onMoveBlock,
  onInsertBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onToggleHidden,
  onToggleLocked,
  disabled,
}: BlockCanvasProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (index: number, e: React.DragEvent) => {
      if (disabled) return;
      e.dataTransfer.setData("application/email-block-reorder", String(index));
      e.dataTransfer.effectAllowed = "move";
      setDraggedIndex(index);
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (index: number, e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = draggedIndex !== null ? "move" : "copy";
      setDragOverIndex(index);
    },
    [disabled, draggedIndex]
  );

  const handleDrop = useCallback(
    (index: number, e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;

      const reorderIndex = e.dataTransfer.getData("application/email-block-reorder");
      const newBlockType = e.dataTransfer.getData("application/email-block-type") as EmailBlockType;

      if (reorderIndex !== "") {
        const from = parseInt(reorderIndex, 10);
        if (!isNaN(from) && from !== index) {
          onMoveBlock(from, index > from ? index - 1 : index);
        }
      } else if (newBlockType) {
        onInsertBlock(newBlockType, index);
      }

      setDragOverIndex(null);
      setDraggedIndex(null);
    },
    [disabled, onMoveBlock, onInsertBlock]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    setDraggedIndex(null);
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;

      const newBlockType = e.dataTransfer.getData("application/email-block-type") as EmailBlockType;
      if (newBlockType) {
        onInsertBlock(newBlockType, blocks.length);
      }
      setDragOverIndex(null);
      setDraggedIndex(null);
    },
    [disabled, blocks.length, onInsertBlock]
  );

  const handleCanvasDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      if (draggedIndex === null) {
        setDragOverIndex(blocks.length);
      }
    },
    [disabled, draggedIndex, blocks.length]
  );

  return (
    <div
      className="space-y-0"
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
    >
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
          <div className="text-4xl mb-3 opacity-30">+</div>
          <p className="text-sm font-medium">No blocks yet</p>
          <p className="text-xs mt-1">Drag elements from the palette or click to add</p>
        </div>
      )}

      {blocks.map((block, index) => {
        const isSelected = block.id === selectedId;
        const isDragging = draggedIndex === index;
        const isDropTarget = dragOverIndex === index;
        const colorClass = BLOCK_COLORS[block.type];

        return (
          <div key={block.id}>
            {/* Drop zone indicator above */}
            {isDropTarget && draggedIndex !== null && draggedIndex !== index && (
              <div className="h-0.5 bg-[var(--color-brand-500)] rounded-full mx-2 transition-all" />
            )}

            {/* Block */}
            <div
              draggable={!disabled && !block.locked}
              onDragStart={(e) => handleDragStart(index, e)}
              onDragOver={(e) => handleDragOver(index, e)}
              onDrop={(e) => handleDrop(index, e)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : block.id);
              }}
              className={`group relative flex items-stretch border transition-all ${
                isSelected
                  ? "border-[var(--color-brand-400)] ring-2 ring-[var(--color-brand-100)]"
                  : "border-transparent hover:border-[var(--color-border)]"
              } ${isDragging ? "opacity-40" : ""} ${block.hidden ? "opacity-40" : ""} ${
                block.locked ? "pointer-events-none" : ""
              }`}
            >
              {/* Drag handle + actions */}
              <div className="flex flex-col items-center w-8 bg-[var(--color-surface-secondary)] border-r border-[var(--color-border)] flex-shrink-0">
                {!disabled && (
                  <span className="mt-1.5 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <GripVerticalIcon className="size-3" />
                  </span>
                )}
                <div className="flex-1" />
                {!disabled && (
                  <div className="flex flex-col items-center gap-0.5 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveBlock(index, Math.max(0, index - 1));
                      }}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUpIcon className="size-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveBlock(index, Math.min(blocks.length - 1, index + 1));
                      }}
                      disabled={index === blocks.length - 1}
                      className="p-0.5 rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDownIcon className="size-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Block content area */}
              <div className="flex-1 min-w-0">
                {/* Block header bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${colorClass}`}>
                    {BLOCK_TYPE_ICONS[block.type]}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--color-text)] truncate">
                    {BLOCK_TYPE_LABELS[block.type]}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] truncate flex-1">
                    {getBlockLabel(block)}
                  </span>

                  {/* Action buttons */}
                  {!disabled && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateBlock(block.id);
                        }}
                        className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        title="Duplicate"
                      >
                        <CopyIcon className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleHidden(block.id);
                        }}
                        className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        title={block.hidden ? "Show" : "Hide"}
                      >
                        {block.hidden ? <EyeOffIcon className="size-3" /> : <EyeIcon className="size-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLocked(block.id);
                        }}
                        className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        title={block.locked ? "Unlock" : "Lock"}
                      >
                        {block.locked ? <LockIcon className="size-3" /> : <LockOpenIcon className="size-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBlock(block.id);
                        }}
                        className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]"
                        title="Delete"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Block preview */}
                <div className="px-4 py-3 min-h-[40px]">
                  <BlockPreview block={block} />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Final drop zone */}
      {blocks.length > 0 && dragOverIndex === blocks.length && (
        <div className="h-0.5 bg-[var(--color-brand-500)] rounded-full mx-2 transition-all" />
      )}
    </div>
  );
}

function BlockPreview({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case "header": {
      const p = block.props as import("./types").HeaderBlockProps;
      const sizeMap = { h1: "text-xl", h2: "text-lg", h3: "text-base" };
      return (
        <div style={{ color: p.color, textAlign: p.align }} className={`${sizeMap[p.level]} font-semibold`}>
          {p.text}
        </div>
      );
    }
    case "text": {
      const p = block.props as import("./types").TextBlockProps;
      return (
        <div
          style={{ color: p.color, fontSize: `${Math.min(p.fontSize, 14)}px`, textAlign: p.align, lineHeight: p.lineHeight }}
          className="truncate"
        >
          {p.content.replace(/<[^>]*>/g, "")}
        </div>
      );
    }
    case "image": {
      const p = block.props as import("./types").ImageBlockProps;
      if (!p.src) {
        return (
          <div className="flex items-center justify-center h-12 bg-[var(--color-surface-secondary)] rounded border border-dashed border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
            No image set
          </div>
        );
      }
      return (
        <div style={{ textAlign: p.align }}>
          <Image
            src={p.src}
            alt={p.alt}
            style={{ maxWidth: `${p.width}%`, maxHeight: 60, objectFit: "contain" }}
            width={100}
            height={60}
          />
        </div>
      );
    }
    case "button": {
      const p = block.props as import("./types").ButtonBlockProps;
      return (
        <div style={{ textAlign: p.align }}>
          <span
            className="inline-block px-5 py-2 text-xs font-semibold"
            style={{ backgroundColor: p.bgColor, color: p.textColor, borderRadius: p.borderRadius }}
          >
            {p.text}
          </span>
        </div>
      );
    }
    case "divider": {
      const p = block.props as import("./types").DividerBlockProps;
      return (
        <hr
          style={{
            border: "none",
            borderTop: `${p.thickness}px ${p.style} ${p.color}`,
            width: p.widthPercent < 100 ? `${p.widthPercent}%` : "100%",
            margin: p.widthPercent < 100 ? (p.align === "center" ? "0 auto" : p.align === "right" ? "0 0 0 auto" : "0") : undefined,
          }}
        />
      );
    }
    case "spacer": {
      const p = block.props as import("./types").SpacerBlockProps;
      const h = Math.min(p.height, 60);
      return (
        <div style={{ height: `${h}px` }} className="flex items-center justify-center">
          <span className="text-[9px] text-[var(--color-text-muted)]">{p.height}px</span>
        </div>
      );
    }
    case "columns": {
      const p = block.props as import("./types").ColumnsBlockProps;
      return (
        <div className="flex gap-2">
          {p.columns.map((col) => (
            <div
              key={col.id}
              className="flex-1 min-h-[32px] border border-dashed border-[var(--color-border)] rounded px-2 py-1 text-[9px] text-[var(--color-text-muted)]"
              style={{ flex: `0 0 ${col.widthPercent}%` }}
            >
              {col.blocks.length === 0 ? "Empty column" : `${col.blocks.length} block(s)`}
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
