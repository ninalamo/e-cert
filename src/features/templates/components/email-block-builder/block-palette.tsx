"use client";

import { useState } from "react";
import type { EmailBlockType } from "./types";
import { BLOCK_TYPE_LABELS } from "./block-definitions";
import {
  PanelTopIcon,
  TypeIcon,
  ImageIcon,
  MousePointer2Icon,
  MinusIcon,
  ArrowUpDownIcon,
  ColumnsIcon,
  ChevronDownIcon,
  GripVerticalIcon,
} from "lucide-react";

const BLOCK_PALETTE_ITEMS: {
  type: EmailBlockType;
  icon: React.ReactNode;
  color: string;
}[] = [
  { type: "header", icon: <PanelTopIcon className="size-4" />, color: "text-blue-600" },
  { type: "text", icon: <TypeIcon className="size-4" />, color: "text-zinc-600" },
  { type: "image", icon: <ImageIcon className="size-4" />, color: "text-emerald-600" },
  { type: "button", icon: <MousePointer2Icon className="size-4" />, color: "text-violet-600" },
  { type: "divider", icon: <MinusIcon className="size-4" />, color: "text-orange-500" },
  { type: "spacer", icon: <ArrowUpDownIcon className="size-4" />, color: "text-slate-400" },
  { type: "columns", icon: <ColumnsIcon className="size-4" />, color: "text-cyan-600" },
];

interface BlockPaletteProps {
  onAddBlock: (type: EmailBlockType) => void;
  disabled?: boolean;
}

export default function BlockPalette({ onAddBlock, disabled }: BlockPaletteProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        Elements
        <ChevronDownIcon
          className={`size-3.5 text-[var(--color-text-muted)] transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="space-y-1 px-2 pb-2">
          {BLOCK_PALETTE_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => onAddBlock(item.type)}
              disabled={disabled}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/email-block-type", item.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50 cursor-grab active:cursor-grabbing"
              title={`Add ${BLOCK_TYPE_LABELS[item.type]} block`}
            >
              <span className={`${item.color}`}>{item.icon}</span>
              <span className="flex-1 text-left">{BLOCK_TYPE_LABELS[item.type]}</span>
              <GripVerticalIcon className="size-3 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
