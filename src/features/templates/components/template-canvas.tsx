"use client";

import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { PLACEHOLDER_FIELDS } from "./placeholder-field";

export interface CanvasElement {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  src?: string;
  content: string;
  fontSize: string;
  fontFamily: string;
  color: string;
  bold: boolean;
  align: "left" | "center" | "right";
}

interface TemplateCanvasProps {
  value: string;
  onChange: (html: string) => void;
  css: string;
  onCssChange: (css: string) => void;
}

const FONT_FAMILIES = [
  "Georgia, serif",
  "Times New Roman, serif",
  "Arial, sans-serif",
  "Helvetica, sans-serif",
  "Courier New, monospace",
  "Verdana, sans-serif",
  "Trebuchet MS, sans-serif",
  "Palatino, serif",
];

const FONT_SIZES = [
  "10px", "12px", "14px", "16px", "18px", "20px",
  "24px", "28px", "32px", "36px", "48px", "60px", "72px",
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}

export function elementsToHtml(
  elements: CanvasElement[],
  width = 1123,
  height = 794
): string {
  const sorted = [...elements].sort((a, b) => a.z - b.z);
  const blocks = sorted
    .map((el) => {
      const common = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};`;
      if (el.type === "image") {
        return `<div style="${common}"><img src="${escapeAttr(
          el.src ?? ""
        )}" style="width:100%;height:100%;object-fit:contain;display:block;" /></div>`;
      }
      const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};font-size:${el.fontSize};font-family:${escapeAttr(
        el.fontFamily
      )};color:${escapeAttr(el.color)};font-weight:${el.bold ? "bold" : "normal"};text-align:${el.align};overflow:hidden;`;
      return `<div style="${style}">${el.content}</div>`;
    })
    .join("\n");
  return `<div class="certificate" style="position:relative;width:${width}px;height:${height}px;margin:0 auto;">\n${blocks}\n</div>`;
}

function parseHtmlToElements(html: string): CanvasElement[] {
  if (!html || !html.includes("position:absolute")) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.querySelector(".certificate") ?? doc.body;
  const nodes = Array.from(root.children) as HTMLElement[];
  const out: CanvasElement[] = [];
  for (const n of nodes) {
    const style = n.getAttribute("style") ?? "";
    const get = (re: RegExp) => {
      const m = style.match(re);
      return m ? m[1] : "";
    };
    const x = parseInt(get(/left:(\d+)px/), 10) || 0;
    const y = parseInt(get(/top:(\d+)px/), 10) || 0;
    const w = parseInt(get(/width:(\d+)px/), 10) || 200;
    const h = parseInt(get(/height:(\d+)px/), 10) || 60;
    const z = parseInt(get(/z-index:(\d+)/), 10) || 1;
    const img = n.querySelector("img");
    if (img) {
      out.push({
        id: uid(),
        type: "image",
        x, y, w, h, z,
        src: img.getAttribute("src") ?? "",
        content: "",
        fontSize: "16px",
        fontFamily: "Arial, sans-serif",
        color: "#000000",
        bold: false,
        align: "left",
      });
    } else {
      out.push({
        id: uid(),
        type: "text",
        x, y, w, h, z,
        content: n.innerHTML,
        fontSize: get(/font-size:([^;]+)/) || "16px",
        fontFamily: get(/font-family:([^;]+)/) || "Arial, sans-serif",
        color: get(/color:([^;]+)/) || "#000000",
        bold: /font-weight:\s*bold/.test(style),
        align: (get(/text-align:([^;]+)/) as CanvasElement["align"]) || "left",
      });
    }
  }
  return out;
}

function setBackgroundInCss(css: string, dataUrl: string | null): string {
  const rule = `body, .cert-canvas {
  background-image: url("${dataUrl}");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}`;
  const marker = "/* __CERT_BACKGROUND__ */";
  const cleaned = css.replace(/\/\* __CERT_BACKGROUND__ \*\/[\s\S]*?\n}\n?/, "");
  if (!dataUrl) return cleaned.trim();
  return `${cleaned.trim()}\n\n${marker}\n${rule}\n`;
}

function buildStarterElements(): CanvasElement[] {
  return [
    {
      id: uid(), type: "text", x: 80, y: 70, w: 960, h: 70, z: 1,
      content: "Certificate of Completion",
      fontSize: "44px", fontFamily: "Georgia, serif", color: "#1a1a1a",
      bold: true, align: "center",
    },
    {
      id: uid(), type: "text", x: 80, y: 160, w: 960, h: 36, z: 2,
      content: "This is to certify that",
      fontSize: "18px", fontFamily: "Georgia, serif", color: "#444444",
      bold: false, align: "center",
    },
    {
      id: uid(), type: "text", x: 140, y: 210, w: 840, h: 60, z: 3,
      content: "{{recipient_name}}",
      fontSize: "36px", fontFamily: "Georgia, serif", color: "#1a1a1a",
      bold: true, align: "center",
    },
    {
      id: uid(), type: "text", x: 80, y: 290, w: 960, h: 36, z: 4,
      content: "has successfully completed the program",
      fontSize: "18px", fontFamily: "Georgia, serif", color: "#444444",
      bold: false, align: "center",
    },
    {
      id: uid(), type: "text", x: 80, y: 360, w: 480, h: 32, z: 5,
      content: "Certificate No: {{certificate_number}}",
      fontSize: "16px", fontFamily: "Arial, sans-serif", color: "#555555",
      bold: false, align: "left",
    },
    {
      id: uid(), type: "text", x: 560, y: 360, w: 480, h: 32, z: 6,
      content: "Issued on: {{issued_date}}",
      fontSize: "16px", fontFamily: "Arial, sans-serif", color: "#555555",
      bold: false, align: "right",
    },
    {
      id: uid(), type: "text", x: 80, y: 410, w: 960, h: 32, z: 7,
      content: "{{organization_name}}",
      fontSize: "20px", fontFamily: "Georgia, serif", color: "#1a1a1a",
      bold: true, align: "center",
    },
    {
      id: uid(), type: "text", x: 440, y: 470, w: 240, h: 140, z: 8,
      content: "{{qr_code}}",
      fontSize: "14px", fontFamily: "Arial, sans-serif", color: "#000000",
      bold: false, align: "center",
    },
  ];
}

export default function TemplateCanvas({
  value,
  onChange,
  css,
  onCssChange,
}: TemplateCanvasProps) {
  const parsed0 = parseHtmlToElements(value);
  const initialOrientation: "portrait" | "landscape" =
    parsed0.length > 0 ? (parsed0[0].y > parsed0[0].x ? "portrait" : "landscape") : "landscape";

  const [elements, setElements] = useState<CanvasElement[]>(() =>
    parsed0.length > 0 ? parsed0 : buildStarterElements()
  );
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    initialOrientation
  );
  const CANVAS_W = orientation === "landscape" ? 1123 : 794;
  const CANVAS_H = orientation === "landscape" ? 794 : 1123;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const clipboard = useRef<CanvasElement[]>([]);
  const [clipboardCount, setClipboardCount] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<Record<string, { x: number; y: number }>>({});
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    onChange(elementsToHtml(elements, CANVAS_W, CANVAS_H));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, orientation]);

  const isSelected = (id: string) => selectedIds.includes(id);
  const firstSel =
    elements.find((e) => isSelected(e.id)) ?? null;

  function selectOnly(id: string) {
    setSelectedIds([id]);
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function clearSelection() {
    setSelectedIds([]);
  }
  function selectEverything() {
    setSelectedIds(elements.map((e) => e.id));
  }

  function addText() {
    const z = elements.length ? Math.max(...elements.map((e) => e.z)) + 1 : 1;
    const el: CanvasElement = {
      id: uid(),
      type: "text",
      x: 80,
      y: 80,
      w: 400,
      h: 60,
      z,
      content: "Double-click to edit text",
      fontSize: "24px",
      fontFamily: "Georgia, serif",
      color: "#000000",
      bold: false,
      align: "center",
    };
    setElements((prev) => [...prev, el]);
    setSelectedIds([el.id]);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    const z = elements.length ? Math.max(...elements.map((e) => e.z)) + 1 : 1;
    const el: CanvasElement = {
      id: uid(),
      type: "image",
      x: 80,
      y: 80,
      w: 200,
      h: 200,
      z,
      src: url,
      content: "",
      fontSize: "16px",
      fontFamily: "Arial, sans-serif",
      color: "#000000",
      bold: false,
      align: "left",
    };
    setElements((prev) => [...prev, el]);
    setSelectedIds([el.id]);
    e.target.value = "";
  }

  async function handleBackgroundSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    onCssChange(setBackgroundInCss(css, url));
    e.target.value = "";
  }

  function clearBackground() {
    onCssChange(setBackgroundInCss(css, null));
  }

  function seedStarter() {
    setElements(buildStarterElements());
  }

  function update(id: string, patch: Partial<CanvasElement>) {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function updateSelected(patch: Partial<CanvasElement>) {
    setElements((prev) =>
      prev.map((e) => (isSelected(e.id) ? { ...e, ...patch } : e))
    );
  }

  function bringSelectedToFront() {
    const maxZ = elements.length ? Math.max(...elements.map((e) => e.z)) : 0;
    let i = 0;
    setElements((prev) =>
      prev.map((e) =>
        isSelected(e.id) ? { ...e, z: maxZ + 1 + i++ } : e
      )
    );
  }

  function sendSelectedToBack() {
    const minZ = elements.length ? Math.min(...elements.map((e) => e.z)) : 0;
    let i = 0;
    setElements((prev) =>
      prev.map((e) =>
        isSelected(e.id) ? { ...e, z: minZ - 1 - i++ } : e
      )
    );
  }

  function removeSelected() {
    setElements((prev) => prev.filter((e) => !isSelected(e.id)));
    setSelectedIds([]);
  }

  function copySelection() {
    const picked = elements.filter((e) => isSelected(e.id));
    if (picked.length === 0) return;
    clipboard.current = picked.map((e) => ({ ...e }));
    setClipboardCount(picked.length);
  }

  function copyAll() {
    clipboard.current = elements.map((e) => ({ ...e }));
    setClipboardCount(clipboard.current.length);
  }

  function paste() {
    if (clipboard.current.length === 0) return;
    const maxZ = elements.length ? Math.max(...elements.map((e) => e.z)) : 0;
    const pasted = clipboard.current.map((e, i) => ({
      ...e,
      id: uid(),
      x: e.x + 24,
      y: e.y + 24,
      z: maxZ + 1 + i,
    }));
    setElements((prev) => [...prev, ...pasted]);
    setSelectedIds(pasted.map((p) => p.id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length && document.activeElement?.tagName !== "DIV") {
          e.preventDefault();
          removeSelected();
        }
      }
      return;
    }
    const key = e.key.toLowerCase();
    if (key === "c") {
      e.preventDefault();
      if (selectedIds.length) copySelection();
      else copyAll();
    } else if (key === "v") {
      e.preventDefault();
      paste();
    } else if (key === "a") {
      e.preventDefault();
      selectEverything();
    } else if (key === "d") {
      e.preventDefault();
      copySelection();
      paste();
    }
  }

  function handleElementMouseDown(id: string, e: { shiftKey: boolean }) {
    if (e.shiftKey) {
      toggleSelect(id);
    } else if (!isSelected(id)) {
      selectOnly(id);
    }
  }

  function handleDragStart(id: string) {
    if (selectedIds.length > 1 && isSelected(id)) {
      const snap: Record<string, { x: number; y: number }> = {};
      for (const el of elements) {
        if (isSelected(el.id)) snap[el.id] = { x: el.x, y: el.y };
      }
      dragStart.current = snap;
    } else {
      dragStart.current = {};
    }
  }

  function handleDragStop(id: string, d: { x: number; y: number }) {
    if (
      selectedIds.length > 1 &&
      isSelected(id) &&
      dragStart.current[id]
    ) {
      const dx = d.x - dragStart.current[id].x;
      const dy = d.y - dragStart.current[id].y;
      setElements((prev) =>
        prev.map((el) =>
          isSelected(el.id) && dragStart.current[el.id]
            ? { ...el, x: dragStart.current[el.id].x + dx, y: dragStart.current[el.id].y + dy }
            : el
        )
      );
      dragStart.current = {};
    } else {
      update(id, { x: d.x, y: d.y });
    }
  }

  function canvasPoint(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return;
    if (!e.shiftKey) clearSelection();
    const p = canvasPoint(e);
    marqueeStart.current = p;
    setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!marqueeStart.current) return;
      const p = canvasPoint(e);
      const s = marqueeStart.current;
      setMarquee({
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      });
    }
    function onUp() {
      if (!marqueeStart.current || !marquee) {
        marqueeStart.current = null;
        return;
      }
      const m = marquee;
      const hits = elements
        .filter(
          (el) =>
            el.x < m.x + m.w &&
            el.x + el.w > m.x &&
            el.y < m.y + m.h &&
            el.y + el.h > m.y
        )
        .map((el) => el.id);
      setSelectedIds(hits);
      marqueeStart.current = null;
      setMarquee(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [marquee, elements]);

  const hasBackground = /__CERT_BACKGROUND__/.test(css);
  const selCount = selectedIds.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-gray-50 p-1">
        <button
          type="button"
          onClick={addText}
          className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          + Add Text
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Insert Image
        </button>
        <button
          type="button"
          onClick={() => bgInputRef.current?.click()}
          className="rounded bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
        >
          Set Background
        </button>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <button
          type="button"
          onClick={copySelection}
          disabled={selCount === 0}
          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-40"
          title="Copy (Ctrl/Cmd+C)"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={paste}
          disabled={clipboardCount === 0}
          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-40"
          title="Paste (Ctrl/Cmd+V)"
        >
          Paste
        </button>
        <button
          type="button"
          onClick={selectEverything}
          disabled={elements.length === 0}
          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-40"
          title="Select all (Ctrl/Cmd+A)"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={removeSelected}
          disabled={selCount === 0}
          className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-40"
          title="Delete (Del)"
        >
          Delete
        </button>
        {elements.length === 0 && (
          <button
            type="button"
            onClick={() => seedStarter()}
            className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
          >
            Starter Layout
          </button>
        )}
        {hasBackground && (
          <button
            type="button"
            onClick={clearBackground}
            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Clear BG
          </button>
        )}
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <span className="text-xs font-medium text-muted-foreground px-1">
          Orientation:
        </span>
        <button
          type="button"
          onClick={() => setOrientation("landscape")}
          className={`rounded px-2 py-1 text-xs ${orientation === "landscape" ? "bg-black text-white" : "bg-gray-100"}`}
        >
          Landscape
        </button>
        <button
          type="button"
          onClick={() => setOrientation("portrait")}
          className={`rounded px-2 py-1 text-xs ${orientation === "portrait" ? "bg-black text-white" : "bg-gray-100"}`}
        >
          Portrait
        </button>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <span className="text-xs font-medium text-muted-foreground px-1">
          Fields:
        </span>
        {PLACEHOLDER_FIELDS.map((f) => (
          <button
            key={f.key}
            type="button"
            disabled={selCount !== 1 || !firstSel || firstSel.type !== "text"}
            onClick={() => {
              if (!firstSel) return;
              update(firstSel.id, {
                content: `${firstSel.content}{{${f.key}}}`,
              });
            }}
            className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
          >
            {f.label}
          </button>
        ))}
      </div>

      {selCount > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-md border bg-white p-1">
          <span className="px-1 text-xs font-medium text-muted-foreground">
            {selCount} selected
          </span>
          <select
            value={firstSel?.fontFamily ?? ""}
            onChange={(e) => updateSelected({ fontFamily: e.target.value })}
            className="rounded border px-1 py-1 text-xs"
            title="Font family"
          >
            <option value="">Font</option>
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f.split(",")[0]}
              </option>
            ))}
          </select>
          <select
            value={firstSel?.fontSize ?? ""}
            onChange={(e) => updateSelected({ fontSize: e.target.value })}
            className="rounded border px-1 py-1 text-xs"
            title="Font size"
          >
            <option value="">Size</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="color"
            value={firstSel?.color ?? "#000000"}
            onChange={(e) => updateSelected({ color: e.target.value })}
            className="h-7 w-8 cursor-pointer rounded border"
            title="Text color"
          />
          <button
            type="button"
            onClick={() => updateSelected({ bold: !firstSel?.bold })}
            className={`rounded px-2 py-1 text-sm ${firstSel?.bold ? "bg-gray-200 font-bold" : "hover:bg-gray-200"}`}
          >
            B
          </button>
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => updateSelected({ align: a })}
              className={`rounded px-2 py-1 text-xs ${firstSel?.align === a ? "bg-gray-200" : "hover:bg-gray-200"}`}
            >
              {a}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-gray-300" />
          <button
            type="button"
            onClick={bringSelectedToFront}
            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
          >
            Front
          </button>
          <button
            type="button"
            onClick={sendSelectedToBack}
            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
          >
            Back
          </button>
          <button
            type="button"
            onClick={removeSelected}
            className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBackgroundSelect}
      />

      <div
        className="cert-canvas overflow-auto rounded-md border bg-white p-4"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="inline-block bg-gray-100 p-2">
          <Ruler orientation="horizontal" length={CANVAS_W} />
          <div className="flex">
            <Ruler orientation="vertical" length={CANVAS_H} />
            <div
              ref={canvasRef}
              className="relative shadow"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                background: "transparent",
              }}
              onMouseDown={handleCanvasMouseDown}
            >
              {elements.map((el) => (
                <Rnd
                  key={el.id}
                  size={{ width: el.w, height: el.h }}
                  position={{ x: el.x, y: el.y }}
                  bounds="parent"
                  dragHandleClassName="cert-drag"
                  onDragStart={() => handleDragStart(el.id)}
                  onDragStop={(_, d) => handleDragStop(el.id, d)}
                  onResizeStop={(_, __, ref, ___, pos) =>
                    update(el.id, {
                      w: parseInt(ref.style.width, 10),
                      h: parseInt(ref.style.height, 10),
                      x: pos.x,
                      y: pos.y,
                    })
                  }
                  style={{ zIndex: el.z }}
                  onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                  className={`group ${
                    isSelected(el.id)
                      ? "ring-2 ring-blue-500"
                      : "ring-1 ring-transparent hover:ring-blue-300"
                  }`}
                >
                  <div className="relative h-full w-full">
                    {isSelected(el.id) && (
                      <div
                        className="cert-drag absolute -top-6 left-0 z-10 flex cursor-move items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white"
                      >
                        <span>⠿ drag</span>
                      </div>
                    )}
                    {el.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={el.src}
                        alt=""
                        draggable={false}
                        className="cert-drag h-full w-full"
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) =>
                          update(el.id, { content: e.currentTarget.innerHTML })
                        }
                        onMouseDown={(e) => {
                          if (isSelected(el.id)) e.stopPropagation();
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          fontSize: el.fontSize,
                          fontFamily: el.fontFamily,
                          color: el.color,
                          fontWeight: el.bold ? "bold" : "normal",
                          textAlign: el.align,
                          overflow: "hidden",
                          outline: "none",
                          cursor: "text",
                        }}
                        dangerouslySetInnerHTML={{ __html: el.content }}
                      />
                    )}
                  </div>
                </Rnd>
              ))}

              {marquee && (
                <div
                  className="pointer-events-none absolute z-50 border border-blue-500 bg-blue-500/20"
                  style={{
                    left: marquee.x,
                    top: marquee.y,
                    width: marquee.w,
                    height: marquee.h,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .cert-canvas .certificate {
          position: relative;
        }
        .cert-ruler {
          background-image: repeating-linear-gradient(
            to right,
            #cbd5e1 0,
            #cbd5e1 1px,
            transparent 1px,
            transparent 50px
          );
        }
      `}</style>
    </div>
  );
}

function Ruler({
  orientation,
  length,
}: {
  orientation: "horizontal" | "vertical";
  length: number;
}) {
  const ticks = [];
  for (let p = 0; p <= length; p += 50) {
    ticks.push(
      <div
        key={p}
        className="absolute bg-gray-400"
        style={
          orientation === "horizontal"
            ? { left: p, top: 0, width: 1, height: p % 100 === 0 ? 10 : 6 }
            : { top: p, left: 0, height: 1, width: p % 100 === 0 ? 10 : 6 }
        }
      />
    );
    if (p % 100 === 0 && p > 0) {
      ticks.push(
        <span
          key={`l${p}`}
          className="absolute text-[9px] text-gray-500"
          style={
            orientation === "horizontal"
              ? { left: p + 2, top: 8 }
              : { top: p + 1, left: 10 }
          }
        >
          {p}
        </span>
      );
    }
  }
  return (
    <div
      className="relative bg-gray-100"
      style={
        orientation === "horizontal"
          ? { width: length, height: 20 }
          : { width: 20, height: length }
      }
    >
      {ticks}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
