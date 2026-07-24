"use client";

import {
  GripVerticalIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  LockOpenIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
} from "lucide-react";

export interface ComponentsSidebarItem {
  id: string;
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  hidden?: boolean;
  locked?: boolean;
}

export interface ComponentsSidebarProps {
  items: ComponentsSidebarItem[];
  expanded?: boolean;
  onToggle?: () => void;
  selectedId?: string | null;
  onSelect?: (id: string, e: React.MouseEvent) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onToggleHidden?: (id: string) => void;
  onToggleLocked?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDragStart?: (id: string, e: React.DragEvent) => void;
  onDragOver?: (id: string, e: React.DragEvent) => void;
  onDrop?: (id: string) => void;
  onDragEnd?: () => void;
  onDragLeave?: () => void;
  disabled?: boolean;
  dragOverId?: string | null;
  draggedId?: string | null;
  dropSide?: "before" | "after";
  emptyMessage?: string;
  title?: string;
}

export default function ComponentsSidebar({
  items,
  expanded = true,
  onToggle,
  selectedId,
  onSelect,
  onReorder,
  onToggleHidden,
  onToggleLocked,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragLeave,
  disabled = false,
  dragOverId,
  draggedId,
  dropSide = "before",
  emptyMessage = "No components yet",
  title = "Components",
}: ComponentsSidebarProps) {
  return (
    <div className="flex-shrink-0 flex flex-col">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] flex flex-col min-h-0 flex-shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full border-b border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between flex-shrink-0 transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            {items.length}
          </span>
          <ChevronRightIcon className={`size-4 text-[var(--color-text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      {expanded && (
        <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-[var(--color-border)]">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
              {emptyMessage}
            </p>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-1.5 px-2 py-2 text-xs cursor-pointer transition-all select-none ${
                  item.hidden ? "opacity-40" : ""
                } ${
                  dragOverId === item.id && draggedId !== item.id
                    ? dropSide === "before"
                      ? "border-t-2 border-t-[var(--color-brand-500)]"
                      : "border-b-2 border-b-[var(--color-brand-500)]"
                    : ""
                } ${draggedId === item.id ? "opacity-30" : ""} ${
                  selectedId === item.id
                    ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                }`}
                draggable
                onDragStart={(e) => onDragStart?.(item.id, e)}
                onDragOver={(e) => onDragOver?.(item.id, e)}
                onDrop={() => onDrop?.(item.id)}
                onDragEnd={onDragEnd}
                onDragLeave={onDragLeave}
                onClick={(e) => onSelect?.(item.id, e)}
              >
                <span className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  <GripVerticalIcon className="size-3" />
                </span>
                <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${item.color}`}>
                  {item.icon}
                </span>
                <span className="truncate flex-1">{item.label}</span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (index > 0) onReorder?.(index, index - 1);
                    }}
                    disabled={index === 0 || disabled}
                    className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)] disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUpIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (index < items.length - 1) onReorder?.(index, index + 1);
                    }}
                    disabled={index === items.length - 1 || disabled}
                    className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)] disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDownIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHidden?.(item.id);
                    }}
                    disabled={disabled}
                    className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)]"
                    title={item.hidden ? "Show" : "Hide"}
                  >
                    {item.hidden ? <EyeOffIcon className="size-3" /> : <EyeIcon className="size-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLocked?.(item.id);
                    }}
                    disabled={disabled}
                    className="rounded p-0.5 hover:bg-[var(--color-surface-secondary)]"
                    title={item.locked ? "Unlock" : "Lock"}
                  >
                    {item.locked ? <LockIcon className="size-3 text-amber-500" /> : <LockOpenIcon className="size-3 text-[var(--color-text-muted)]" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(item.id);
                    }}
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
  );
}