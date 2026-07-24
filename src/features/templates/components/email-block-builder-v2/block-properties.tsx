"use client";

import React from "react";
import type {
  EmailBlock,
  HeaderBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SpacerBlockProps,
  ColumnsBlockProps,
  TableBlockProps,
} from "./types";
import { BLOCK_TYPE_LABELS } from "./block-definitions";
import { EMAIL_PLACEHOLDER_FIELDS, PlaceholderKey } from "./types";
import { XIcon, ChevronDownIcon } from "lucide-react";

interface BlockPropertiesProps {
  block: EmailBlock;
  onUpdate: (props: Partial<EmailBlock["props"]>) => void;
  onClose: () => void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brand-400)]"
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 rounded-lg border border-[var(--color-border)] cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brand-400)]"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brand-400)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PaddingFields({
  top,
  right,
  bottom,
  left,
  onChange,
}: {
  top: number;
  right: number;
  bottom: number;
  left: number;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <Section label="Padding">
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Top" value={top} onChange={(v) => onChange("paddingTop", parseInt(v) || 0)} type="number" min={0} />
        <InputField label="Right" value={right} onChange={(v) => onChange("paddingRight", parseInt(v) || 0)} type="number" min={0} />
        <InputField label="Bottom" value={bottom} onChange={(v) => onChange("paddingBottom", parseInt(v) || 0)} type="number" min={0} />
        <InputField label="Left" value={left} onChange={(v) => onChange("paddingLeft", parseInt(v) || 0)} type="number" min={0} />
      </div>
    </Section>
  );
}

function PlaceholderDropdown({ onSelect }: { onSelect: (ph: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        Insert placeholder
        <ChevronDownIcon className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg max-h-40 overflow-y-auto">
          {EMAIL_PLACEHOLDER_FIELDS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                onSelect(`{{${f.key}}}`);
                setOpen(false);
              }}
              className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-[var(--color-surface-hover)]"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeaderProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"header">;
  onUpdate: (props: Partial<HeaderBlockProps>) => void;
}) {
  const p = block.props;
  return (
    <>
      <Section label="Content">
        <InputField label="Text" value={p.text} onChange={(v) => onUpdate({ text: v })} />
        <SelectField
          label="Level"
          value={p.level}
          onChange={(v) => onUpdate({ level: v as HeaderBlockProps["level"] })}
          options={[
            { value: "h1", label: "H1 (Large)" },
            { value: "h2", label: "H2 (Medium)" },
            { value: "h3", label: "H3 (Small)" },
          ]}
        />
      </Section>
      <Section label="Style">
        <ColorField label="Color" value={p.color} onChange={(v) => onUpdate({ color: v })} />
        <SelectField
          label="Alignment"
          value={p.align}
          onChange={(v) => onUpdate({ align: v as HeaderBlockProps["align"] })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
      </Section>
      <PaddingFields
        top={p.paddingTop}
        right={p.paddingRight}
        bottom={p.paddingBottom}
        left={p.paddingLeft}
        onChange={(key, val) => onUpdate({ [key]: val })}
      />
    </>
  );
}

function TextProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"text">;
  onUpdate: (props: Partial<TextBlockProps>) => void;
}) {
  const p = block.props;
  return (
    <>
      <Section label="Content">
        <div>
          <label className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">
            Text (HTML supported)
          </label>
          <textarea
            value={p.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brand-400)] resize-none"
          />
        </div>
        <PlaceholderDropdown onSelect={(ph) => onUpdate({ content: p.content + ph })} />
      </Section>
      <Section label="Style">
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Color" value={p.color} onChange={(v) => onUpdate({ color: v })} />
          <InputField label="Font Size" value={p.fontSize} onChange={(v) => onUpdate({ fontSize: parseInt(v) || 14 })} type="number" min={8} max={72} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Alignment"
            value={p.align}
            onChange={(v) => onUpdate({ align: v as TextBlockProps["align"] })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
          <InputField label="Line Height" value={p.lineHeight} onChange={(v) => onUpdate({ lineHeight: parseFloat(v) || 1.5 })} type="number" min={0.5} max={3} step={0.1} />
        </div>
      </Section>
      <PaddingFields
        top={p.paddingTop}
        right={p.paddingRight}
        bottom={p.paddingBottom}
        left={p.paddingLeft}
        onChange={(key, val) => onUpdate({ [key]: val })}
      />
    </>
  );
}

function ImageProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"image">;
  onUpdate: (props: Partial<ImageBlockProps>) => void;
}) {
  const p = block.props;
  return (
    <>
      <Section label="Image">
        <InputField label="URL" value={p.src} onChange={(v) => onUpdate({ src: v })} placeholder="https://..." />
        <InputField label="Alt Text" value={p.alt} onChange={(v) => onUpdate({ alt: v })} />
        <InputField label="Width %" value={p.width} onChange={(v) => onUpdate({ width: parseInt(v) || 100 })} type="number" min={10} max={100} />
      </Section>
      <Section label="Style">
        <SelectField
          label="Alignment"
          value={p.align}
          onChange={(v) => onUpdate({ align: v as ImageBlockProps["align"] })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
      </Section>
      <PaddingFields
        top={p.paddingTop}
        right={p.paddingRight}
        bottom={p.paddingBottom}
        left={p.paddingLeft}
        onChange={(key, val) => onUpdate({ [key]: val })}
      />
    </>
  );
}

function ButtonProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"button">;
  onUpdate: (props: Partial<ButtonBlockProps>) => void;
}) {
  const p = block.props;
  return (
    <>
      <Section label="Button">
        <InputField label="Text" value={p.text} onChange={(v) => onUpdate({ text: v })} />
        <InputField label="Link URL" value={p.href} onChange={(v) => onUpdate({ href: v })} placeholder="https:// or {{placeholder}}" />
        <PlaceholderDropdown onSelect={(ph) => onUpdate({ href: p.href + ph })} />
      </Section>
      <Section label="Style">
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Background" value={p.bgColor} onChange={(v) => onUpdate({ bgColor: v })} />
          <ColorField label="Text Color" value={p.textColor} onChange={(v) => onUpdate({ textColor: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Border Radius" value={p.borderRadius} onChange={(v) => onUpdate({ borderRadius: parseInt(v) || 0 })} type="number" min={0} max={50} />
          <SelectField
            label="Alignment"
            value={p.align}
            onChange={(v) => onUpdate({ align: v as ButtonBlockProps["align"] })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </div>
      </Section>
      <PaddingFields
        top={p.paddingTop}
        right={p.paddingRight}
        bottom={p.paddingBottom}
        left={p.paddingLeft}
        onChange={(key, val) => onUpdate({ [key]: val })}
      />
    </>
  );
}

function DividerProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"divider">;
  onUpdate: (props: Partial<DividerBlockProps>) => void;
}) {
  const p = block.props;
  return (
    <>
      <Section label="Divider">
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Color" value={p.color} onChange={(v) => onUpdate({ color: v })} />
          <InputField label="Thickness" value={p.thickness} onChange={(v) => onUpdate({ thickness: parseInt(v) || 1 })} type="number" min={1} max={10} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Style"
            value={p.style}
            onChange={(v) => onUpdate({ style: v as DividerBlockProps["style"] })}
            options={[
              { value: "solid", label: "Solid" },
              { value: "dashed", label: "Dashed" },
              { value: "dotted", label: "Dotted" },
            ]}
          />
          <InputField label="Width %" value={p.widthPercent} onChange={(v) => onUpdate({ widthPercent: parseInt(v) || 100 })} type="number" min={10} max={100} />
        </div>
        <SelectField
          label="Alignment"
          value={p.align}
          onChange={(v) => onUpdate({ align: v as DividerBlockProps["align"] })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
      </Section>
      <PaddingFields
        top={p.paddingTop}
        right={p.paddingRight}
        bottom={p.paddingBottom}
        left={p.paddingLeft}
        onChange={(key, val) => onUpdate({ [key]: val })}
      />
    </>
  );
}

function SpacerProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"spacer">;
  onUpdate: (props: Partial<SpacerBlockProps>) => void;
}) {
  return (
    <Section label="Spacer">
      <InputField
        label="Height"
        value={block.props.height}
        onChange={(v) => onUpdate({ height: parseInt(v) || 16 })}
        type="number"
        min={4}
        max={200}
      />
    </Section>
  );
}

function ColumnsProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"columns">;
  onUpdate: (props: Partial<ColumnsBlockProps>) => void;
}) {
  const p = block.props;
  return (
    <>
      <Section label="Columns">
        <SelectField
          label="Column Count"
          value={String(p.columnCount)}
          onChange={(v) => {
            const count = parseInt(v) as 2 | 3;
            const newCols = p.columns.slice(0, count);
            while (newCols.length < count) {
              newCols.push({
                id: Math.random().toString(36).slice(2, 9),
                widthPercent: Math.floor(100 / count),
                blocks: [],
              });
            }
            const equalWidth = Math.floor(100 / count);
            newCols.forEach((c) => (c.widthPercent = equalWidth));
            onUpdate({ columnCount: count, columns: newCols });
          }}
          options={[
            { value: "2", label: "2 Columns" },
            { value: "3", label: "3 Columns" },
          ]}
        />
        <InputField label="Gap" value={p.gap} onChange={(v) => onUpdate({ gap: parseInt(v) || 0 })} type="number" min={0} max={48} />
      </Section>
      <Section label="Column Widths">
        {p.columns.map((col, i) => (
          <InputField
            key={col.id}
            label={`Column ${i + 1} Width`}
            value={col.widthPercent}
            onChange={(v) => {
              const newCols = [...p.columns];
              newCols[i] = { ...newCols[i], widthPercent: parseInt(v) || 50 };
              onUpdate({ columns: newCols });
            }}
            type="number"
            min={10}
            max={90}
          />
        ))}
      </Section>
      <PaddingFields
        top={p.paddingTop}
        right={p.paddingRight}
        bottom={p.paddingBottom}
        left={p.paddingLeft}
        onChange={(key, val) => onUpdate({ [key]: val })}
      />
    </>
  );
}

function TableProperties({
  block,
  onUpdate,
}: {
  block: EmailBlock<"table">;
  onUpdate: (props: Partial<TableBlockProps>) => void;
}) {
  const p = block.props;
  return (
    <>
      <Section label="Table">
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Rows" value={p.rows.length} onChange={(v) => {
            const count = Math.max(1, parseInt(v) || 1);
            const newRows = [...p.rows];
            if (newRows.length < count) {
              const cols = newRows[0]?.cells.length || 2;
              while (newRows.length < count) {
                newRows.push({
                  cells: Array.from({ length: cols }, (_, i) => ({ content: `Cell ${i + 1}`, isHeader: false }))
                });
              }
            } else if (newRows.length > count) {
              newRows.splice(count);
            }
            onUpdate({ rows: newRows });
          }} type="number" min={1} max={20} />
          <InputField label="Columns" value={p.rows[0]?.cells.length || 2} onChange={(v) => {
            const count = Math.max(1, parseInt(v) || 1);
            const newRows = p.rows.map(row => {
              const newCells = [...row.cells];
              if (newCells.length < count) {
                while (newCells.length < count) {
                  newCells.push({ content: `Cell ${newCells.length + 1}`, isHeader: row.cells[0]?.isHeader || false });
                }
              } else if (newCells.length > count) {
                newCells.splice(count);
              }
              return { ...row, cells: newCells };
            });
            onUpdate({ rows: newRows });
          }} type="number" min={1} max={10} />
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={p.rows[0]?.cells.every(c => c.isHeader) || false}
            onChange={(e) => {
              const newRows = p.rows.map((row, ri) => ({
                ...row,
                cells: row.cells.map(c => ({ ...c, isHeader: ri === 0 && e.target.checked }))
              }));
              onUpdate({ rows: newRows });
            }}
            className="rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
          />
          <span className="text-[var(--color-text-secondary)]">First row as header</span>
        </label>
      </Section>
      <Section label="Style">
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Header Text" value={p.headerColor} onChange={(v) => onUpdate({ headerColor: v })} />
          <ColorField label="Header BG" value={p.headerBgColor} onChange={(v) => onUpdate({ headerBgColor: v })} />
          <ColorField label="Row Text" value={p.rowColor} onChange={(v) => onUpdate({ rowColor: v })} />
          <ColorField label="Row BG" value={p.rowBgColor} onChange={(v) => onUpdate({ rowBgColor: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Border Color" value={p.borderColor} onChange={(v) => onUpdate({ borderColor: v })} />
          <InputField label="Border Width" value={p.borderWidth} onChange={(v) => onUpdate({ borderWidth: parseInt(v) || 1 })} type="number" min={0} max={5} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Cell Padding" value={p.cellPadding} onChange={(v) => onUpdate({ cellPadding: parseInt(v) || 8 })} type="number" min={0} max={30} />
          <SelectField
            label="Alignment"
            value={p.align}
            onChange={(v) => onUpdate({ align: v as TableBlockProps["align"] })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </div>
      </Section>
      <Section label="Cell Content">
        {p.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="space-y-1">
            <div className="text-[10px] font-medium text-[var(--color-text-muted)]">Row {rowIndex + 1} {row.cells[0]?.isHeader ? '(Header)' : ''}</div>
            <div className="grid grid-cols-2 gap-1">
              {row.cells.map((cell, cellIndex) => (
                <input
                  key={cellIndex}
                  type="text"
                  value={cell.content}
                  onChange={(e) => {
                    const newRows = [...p.rows];
                    newRows[rowIndex] = {
                      ...newRows[rowIndex],
                      cells: newRows[rowIndex].cells.map((c, i) => i === cellIndex ? { ...c, content: e.target.value } : c)
                    };
                    onUpdate({ rows: newRows });
                  }}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brand-400)]"
                  placeholder={cell.isHeader ? `Header ${cellIndex + 1}` : `Cell ${cellIndex + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
      </Section>
      <PaddingFields
        top={p.paddingTop}
        right={p.paddingRight}
        bottom={p.paddingBottom}
        left={p.paddingLeft}
        onChange={(key, val) => onUpdate({ [key]: val })}
      />
    </>
  );
}

export default function BlockProperties({ block, onUpdate, onClose }: BlockPropertiesProps) {
  const handleUpdate = (props: Record<string, unknown>) => {
    onUpdate(props);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-600)]">
            {BLOCK_TYPE_LABELS[block.type]}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">Properties</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          title="Deselect"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto">
        {block.type === "header" && (
          <HeaderProperties block={block as EmailBlock<"header">} onUpdate={handleUpdate} />
        )}
        {block.type === "text" && (
          <TextProperties block={block as EmailBlock<"text">} onUpdate={handleUpdate} />
        )}
        {block.type === "image" && (
          <ImageProperties block={block as EmailBlock<"image">} onUpdate={handleUpdate} />
        )}
        {block.type === "button" && (
          <ButtonProperties block={block as EmailBlock<"button">} onUpdate={handleUpdate} />
        )}
        {block.type === "divider" && (
          <DividerProperties block={block as EmailBlock<"divider">} onUpdate={handleUpdate} />
        )}
        {block.type === "spacer" && (
          <SpacerProperties block={block as EmailBlock<"spacer">} onUpdate={handleUpdate} />
        )}
        {block.type === "columns" && (
          <ColumnsProperties block={block as EmailBlock<"columns">} onUpdate={handleUpdate} />
        )}
        {block.type === "table" && (
          <TableProperties block={block as EmailBlock<"table">} onUpdate={handleUpdate} />
        )}
      </div>
    </div>
  );
}