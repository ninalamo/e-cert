"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import Link from "next/link";
import { Rnd } from "react-rnd";
import { PLACEHOLDER_FIELDS } from "./placeholder-field";
import {
  PlusIcon,
  ImageIcon,
  PaletteIcon,
  CopyIcon,
  ClipboardIcon,
  MousePointerIcon,
  Trash2Icon,
  LayersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BoldIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignVerticalJustifyCenterIcon,
  Undo2Icon,
  Redo2Icon,
  TypeIcon,
} from "lucide-react";

type AlignType = "left" | "right" | "top" | "bottom" | "center-horizontal" | "center-vertical";

function alignElements(elements: CanvasElement[], type: AlignType, selectedIds: string[], canvasW: number, canvasH: number): CanvasElement[] {
  const targets = selectedIds.length > 0
    ? elements.filter(e => selectedIds.includes(e.id))
    : elements;

  if (targets.length === 0) return elements;

  const minX = Math.min(...targets.map(e => e.x));
  const maxX = Math.max(...targets.map(e => e.x + e.w));
  const minY = Math.min(...targets.map(e => e.y));
  const maxY = Math.max(...targets.map(e => e.y + e.h));
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  let dx = 0, dy = 0;

  const alignToCanvas = selectedIds.length === 1;

  switch (type) {
    case "left":
      dx = alignToCanvas ? -minX : (selectedIds.length > 0 ? minX : 0 - minX);
      break;
    case "right":
      dx = alignToCanvas ? canvasW - maxX : (selectedIds.length > 0 ? maxX - bboxW : canvasW - maxX);
      break;
    case "top":
      dy = alignToCanvas ? -minY : (selectedIds.length > 0 ? minY : 0 - minY);
      break;
    case "bottom":
      dy = alignToCanvas ? canvasH - maxY : (selectedIds.length > 0 ? maxY - bboxH : canvasH - maxY);
      break;
    case "center-horizontal":
      if (alignToCanvas) {
        const canvasCenterX = canvasW / 2;
        dx = canvasCenterX - (minX + bboxW / 2);
      } else {
        const centerX = selectedIds.length > 0 ? minX + bboxW / 2 : canvasW / 2;
        dx = centerX - (minX + bboxW / 2);
      }
      break;
    case "center-vertical":
      if (alignToCanvas) {
        const canvasCenterY = canvasH / 2;
        dy = canvasCenterY - (minY + bboxH / 2);
      } else {
        const centerY = selectedIds.length > 0 ? minY + bboxH / 2 : canvasH / 2;
        dy = centerY - (minY + bboxH / 2);
      }
      break;
  }

  return elements.map(e => {
    if (selectedIds.length > 0 && !selectedIds.includes(e.id)) return e;
    return { ...e, x: e.x + dx, y: e.y + dy };
  });
}

export interface CanvasElement {
  id: string;
  type: "text" | "image" | "qr";
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
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  preview?: boolean;
  name?: string;
  description?: string;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
}

export interface TemplateCanvasHandle {
  getHtml: () => string;
  getCss: () => string;
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

interface SizePreset {
  label: string;
  w: number;
  h: number;
}

const SIZE_PRESETS: SizePreset[] = [
  { label: "A4", w: 1123, h: 794 },
  { label: "Letter", w: 1056, h: 816 },
  { label: "A3", w: 1587, h: 1123 },
  { label: "Legal", w: 1056, h: 688 },
  { label: "A5", w: 794, h: 559 },
];

const DEFAULT_SIZE_PRESET = "A4";

function extractContainerSize(html: string): { width: number; height: number } | null {
  const wMatch = html.match(/class="certificate"[^>]*?width:(\d+)px/);
  const hMatch = html.match(/class="certificate"[^>]*?height:(\d+)px/);
  if (!wMatch || !hMatch) return null;
  return { width: parseInt(wMatch[1], 10), height: parseInt(hMatch[1], 10) };
}

function matchPreset(w: number, h: number): { preset: string; orientation: "landscape" | "portrait"; customW: number; customH: number } {
  for (const p of SIZE_PRESETS) {
    if (w === p.w && h === p.h) return { preset: p.label, orientation: "landscape", customW: w, customH: h };
    if (w === p.h && h === p.w) return { preset: p.label, orientation: "portrait", customW: w, customH: h };
  }
  return {
    preset: "Custom",
    orientation: w >= h ? "landscape" : "portrait",
    customW: w,
    customH: h,
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function calculateTextHeight(content: string, fontSize: string, width: number): number {
  const size = parseInt(fontSize, 10) || 16;
  const lineHeight = size * 1.5;
  
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = `${width}px`;
  tempDiv.style.fontSize = fontSize;
  tempDiv.style.lineHeight = `${lineHeight}px`;
  tempDiv.style.whiteSpace = 'normal';
  tempDiv.style.wordWrap = 'break-word';
  tempDiv.innerHTML = content;
  document.body.appendChild(tempDiv);
  
  const height = tempDiv.offsetHeight;
  document.body.removeChild(tempDiv);
  
  return Math.max(lineHeight, height);
}

const FIT_TEXT_PADDING = 8;

function calculateTextWidth(content: string, fontSize: string, fontFamily: string, bold: boolean): number {
  const size = parseInt(fontSize, 10) || 16;
  const lineHeight = size * 1.5;

  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.whiteSpace = 'nowrap';
  tempDiv.style.fontSize = fontSize;
  tempDiv.style.fontFamily = fontFamily;
  tempDiv.style.fontWeight = bold ? 'bold' : 'normal';
  tempDiv.style.lineHeight = `${lineHeight}px`;
  tempDiv.innerHTML = content;
  document.body.appendChild(tempDiv);

  let maxWidth = tempDiv.offsetWidth;

  const lines = content.split(/<br\s*\/?>/i);
  if (lines.length > 1) {
    tempDiv.innerHTML = '';
    for (const line of lines) {
      tempDiv.innerHTML = line || '&nbsp;';
      maxWidth = Math.max(maxWidth, tempDiv.offsetWidth);
    }
  }

  document.body.removeChild(tempDiv);
  return maxWidth + FIT_TEXT_PADDING;
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
      if (el.type === "qr") {
        const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};font-size:${el.fontSize};font-family:${escapeAttr(
          el.fontFamily
        )};color:${escapeAttr(el.color)};font-weight:${el.bold ? "bold" : "normal"};text-align:${el.align};overflow:hidden;`;
        return `<div style="${style}">{{qr_code}}</div>`;
      }
      const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};font-size:${el.fontSize};font-family:${escapeAttr(
        el.fontFamily
      )};color:${escapeAttr(el.color)};font-weight:${el.bold ? "bold" : "normal"};text-align:${el.align};overflow:hidden;`;
      return `<div style="${style}">${el.content}</div>`;
    })
    .join("\n");
  return `<div class="certificate" style="position:relative;width:${width}px;height:${height}px;">\n${blocks}\n</div>`;
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
      const innerHtml = n.innerHTML;
      if (innerHtml.trim() === "{{qr_code}}") {
        out.push({
          id: uid(),
          type: "qr",
          x, y, w: Math.max(w, h), h: Math.max(w, h), z,
          content: "{{qr_code}}",
          fontSize: get(/font-size:([^;]+)/) || "16px",
          fontFamily: get(/font-family:([^;]+)/) || "Arial, sans-serif",
          color: get(/color:([^;]+)/) || "#000000",
          bold: /font-weight:\s*bold/.test(style),
          align: (get(/text-align:([^;]+)/) as CanvasElement["align"]) || "center",
        });
      } else {
        out.push({
          id: uid(),
          type: "text",
          x, y, w, h, z,
          content: innerHtml,
          fontSize: get(/font-size:([^;]+)/) || "16px",
          fontFamily: get(/font-family:([^;]+)/) || "Arial, sans-serif",
          color: get(/color:([^;]+)/) || "#000000",
          bold: /font-weight:\s*bold/.test(style),
          align: (get(/text-align:([^;]+)/) as CanvasElement["align"]) || "left",
        });
      }
    }
  }
  return out;
}

function extractBackgroundUrl(css: string): string | null {
  const m = css.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/);
  return m ? m[1] : null;
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
      id: uid(), type: "text", x: 440, y: 470, w: 200, h: 200, z: 8,
      content: "{{qr_code}}",
      fontSize: "14px", fontFamily: "Arial, sans-serif", color: "#000000",
      bold: false, align: "center",
    },
  ];
}

const TemplateCanvas = forwardRef<TemplateCanvasHandle, TemplateCanvasProps>(function TemplateCanvas({
  value,
  onChange,
  css,
  onCssChange,
  fullscreen = false,
  onFullscreenChange,
  submitLabel = "Save",
  loading = false,
  disabled = false,
  preview = false,
  name = "",
  description = "",
  onNameChange,
  onDescriptionChange,
}, ref) {
  const parsed0 = parseHtmlToElements(value);
  const containerSize = extractContainerSize(value);
  const matched = containerSize ? matchPreset(containerSize.width, containerSize.height) : null;
  const initialOrientation: "portrait" | "landscape" =
    matched?.orientation ?? (parsed0.length > 0 ? (parsed0[0].y > parsed0[0].x ? "portrait" : "landscape") : "landscape");

  const [elements, setElements] = useState<CanvasElement[]>(() =>
    parsed0.length > 0 ? parsed0 : buildStarterElements()
  );
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    initialOrientation
  );
  const [sizePreset, setSizePreset] = useState(matched?.preset ?? DEFAULT_SIZE_PRESET);
  const [customW, setCustomW] = useState(matched?.customW ?? 1123);
  const [customH, setCustomH] = useState(matched?.customH ?? 794);

  const preset = SIZE_PRESETS.find((p) => p.label === sizePreset);
  const baseW = preset ? preset.w : customW;
  const baseH = preset ? preset.h : customH;
  const CANVAS_W = orientation === "landscape" ? baseW : baseH;
  const CANVAS_H = orientation === "landscape" ? baseH : baseW;

  useImperativeHandle(ref, () => ({
    getHtml: () => elementsToHtml(elements, CANVAS_W, CANVAS_H),
    getCss: () => css,
  }));

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
  const lastCanvasHtml = useRef("");
  const [gridSize, setGridSize] = useState(20);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [guides, setGuides] = useState<{ orientation: 'horizontal' | 'vertical'; position: number }[]>([]);
  const [activeAlignGuides, setActiveAlignGuides] = useState<{ orientation: 'horizontal' | 'vertical'; position: number }[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>(() => [parsed0]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    // eslint-disable-next-line react-hooks/refs
    if (value !== lastCanvasHtml.current) {
      const newElements = parseHtmlToElements(value);
      if (newElements.length > 0) {
        setElements(newElements);
      }
    }
  }

  // Sync elements → parent during render (not useEffect) so it fires
  // before the canvas can unmount on Design→Advanced switch.
  const currentHtml = elementsToHtml(elements, CANVAS_W, CANVAS_H);
  // eslint-disable-next-line react-hooks/refs
  if (currentHtml !== lastCanvasHtml.current) {
    // eslint-disable-next-line react-hooks/refs
    lastCanvasHtml.current = currentHtml;
    // Defer the parent update to after the current render commit
    queueMicrotask(() => onChange(currentHtml));
  }

  const snapValue = (value: number, orientation: 'horizontal' | 'vertical') => {
    if (!snapEnabled) return value;
    
    const SNAP_THRESHOLD = 5;
    let snapped = value;
    let minDistance = SNAP_THRESHOLD;
    
    guides
      .filter(g => g.orientation === orientation)
      .forEach(guide => {
        const distance = Math.abs(value - guide.position);
        if (distance < minDistance) {
          minDistance = distance;
          snapped = guide.position;
        }
      });
    
    if (minDistance >= SNAP_THRESHOLD) {
      snapped = Math.round(value / gridSize) * gridSize;
    }
    
    return snapped;
  };

  const ALIGN_SNAP_THRESHOLD = 6;

  function computeAlignmentGuides(
    draggingId: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): { snappedX: number; snappedY: number; guides: { orientation: 'horizontal' | 'vertical'; position: number }[] } {
    const result: { orientation: 'horizontal' | 'vertical'; position: number }[] = [];
    let snappedX = x;
    let snappedY = y;

    const dragLeft = x;
    const dragRight = x + w;
    const dragCenterX = x + w / 2;
    const dragTop = y;
    const dragBottom = y + h;
    const dragCenterY = y + h / 2;

    const canvasTargetsX = [
      { value: 0, label: 'left' },
      { value: CANVAS_W / 2, label: 'center' },
      { value: CANVAS_W, label: 'right' },
    ];
    const canvasTargetsY = [
      { value: 0, label: 'top' },
      { value: CANVAS_H / 2, label: 'center' },
      { value: CANVAS_H, label: 'bottom' },
    ];

    let minXDist = ALIGN_SNAP_THRESHOLD;
    let minYDist = ALIGN_SNAP_THRESHOLD;

    for (const t of canvasTargetsX) {
      for (const [dVal] of [[dragLeft, 'left'], [dragCenterX, 'center'], [dragRight, 'right']] as const) {
        const dist = Math.abs(dVal - t.value);
        if (dist < minXDist) {
          minXDist = dist;
          snappedX = x + (t.value - dVal);
          result.push({ orientation: 'vertical', position: t.value });
        }
      }
    }

    for (const t of canvasTargetsY) {
      for (const [dVal] of [[dragTop, 'top'], [dragCenterY, 'center'], [dragBottom, 'bottom']] as const) {
        const dist = Math.abs(dVal - t.value);
        if (dist < minYDist) {
          minYDist = dist;
          snappedY = y + (t.value - dVal);
          result.push({ orientation: 'horizontal', position: t.value });
        }
      }
    }

    const otherElements = elements.filter((el) => el.id !== draggingId && !isSelected(el.id));

    for (const el of otherElements) {
      const elLeft = el.x;
      const elRight = el.x + el.w;
      const elCenterX = el.x + el.w / 2;
      const elTop = el.y;
      const elBottom = el.y + el.h;
      const elCenterY = el.y + el.h / 2;

      for (const [dVal] of [[dragLeft, 'left'], [dragCenterX, 'center'], [dragRight, 'right']] as const) {
        for (const tVal of [elLeft, elCenterX, elRight]) {
          const dist = Math.abs(dVal - tVal);
          if (dist < ALIGN_SNAP_THRESHOLD && dist < minXDist) {
            minXDist = dist;
            snappedX = x + (tVal - dVal);
            result.push({ orientation: 'vertical', position: tVal });
          }
        }
      }

      for (const [dVal] of [[dragTop, 'top'], [dragCenterY, 'center'], [dragBottom, 'bottom']] as const) {
        for (const tVal of [elTop, elCenterY, elBottom]) {
          const dist = Math.abs(dVal - tVal);
          if (dist < ALIGN_SNAP_THRESHOLD && dist < minYDist) {
            minYDist = dist;
            snappedY = y + (tVal - dVal);
            result.push({ orientation: 'horizontal', position: tVal });
          }
        }
      }
    }

    return { snappedX, snappedY, guides: result };
  }

  const saveToHistory = (newElements: CanvasElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newElements]);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setElements([...history[prevIndex]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements([...history[nextIndex]]);
    }
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (fullscreen) onFullscreenChange?.(false);
        setSelectedIds([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, onFullscreenChange]);

  // onChange sync is now during-render (see above) to prevent lost
  // canvas state when switching Design→Advanced before the effect fires.

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
    const newElements = [...elements, el];
    saveToHistory(newElements);
    setElements(newElements);
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
    const newElements = elements.map((e) => (isSelected(e.id) ? { ...e, ...patch } : e));
    saveToHistory(newElements);
    setElements(newElements);
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

  function moveSelectedForward() {
    setElements((prev) => {
      const sorted = [...prev].sort((a, b) => a.z - b.z);
      const selected = sorted.filter((e) => isSelected(e.id));
      const unselected = sorted.filter((e) => !isSelected(e.id));
      if (selected.length === 0) return prev;

      const maxSelZ = Math.max(...selected.map((e) => e.z));
      const nextHigher = unselected.find((e) => e.z > maxSelZ);
      if (!nextHigher) return prev;

      return prev.map((e) => {
        if (isSelected(e.id)) return { ...e, z: e.z + 1 };
        if (e.id === nextHigher.id) return { ...e, z: e.z - 1 };
        return e;
      });
    });
  }

  function moveSelectedBackward() {
    setElements((prev) => {
      const sorted = [...prev].sort((a, b) => a.z - b.z);
      const selected = sorted.filter((e) => isSelected(e.id));
      const unselected = sorted.filter((e) => !isSelected(e.id));
      if (selected.length === 0) return prev;

      const minSelZ = Math.min(...selected.map((e) => e.z));
      const nextLower = [...unselected].reverse().find((e) => e.z < minSelZ);
      if (!nextLower) return prev;

      return prev.map((e) => {
        if (isSelected(e.id)) return { ...e, z: e.z - 1 };
        if (e.id === nextLower.id) return { ...e, z: e.z + 1 };
        return e;
      });
    });
  }

  function removeSelected() {
    const newElements = elements.filter((e) => !isSelected(e.id));
    saveToHistory(newElements);
    setElements(newElements);
    setSelectedIds([]);
  }

  function fitSelectedToText() {
    const newElements = elements.map((el) => {
      if (!isSelected(el.id) || el.type !== 'text') return el;
      const newW = calculateTextWidth(el.content, el.fontSize, el.fontFamily, el.bold);
      const newH = calculateTextHeight(el.content, el.fontSize, newW);
      return { ...el, w: newW, h: newH };
    });
    saveToHistory(newElements);
    setElements(newElements);
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
    const newElements = [...elements, ...pasted];
    saveToHistory(newElements);
    setElements(newElements);
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
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (key === "z" && e.shiftKey) {
      e.preventDefault();
      redo();
    } else if (key === "y") {
      e.preventDefault();
      redo();
    } else if (key === "c") {
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
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const alignment = computeAlignmentGuides(id, d.x, d.y, el.w, el.h);
    const snappedX = alignment.snappedX !== d.x ? alignment.snappedX : snapValue(d.x, 'vertical');
    const snappedY = alignment.snappedY !== d.y ? alignment.snappedY : snapValue(d.y, 'horizontal');
    
    if (
      selectedIds.length > 1 &&
      isSelected(id) &&
      dragStart.current[id]
    ) {
      const dx = snappedX - dragStart.current[id].x;
      const dy = snappedY - dragStart.current[id].y;
      const newElements = elements.map((el) =>
        isSelected(el.id) && dragStart.current[el.id]
          ? { ...el, x: dragStart.current[el.id].x + dx, y: dragStart.current[el.id].y + dy }
          : el
      );
      saveToHistory(newElements);
      setElements(newElements);
      dragStart.current = {};
    } else {
      const newElements = elements.map((e) => e.id === id ? { ...e, x: snappedX, y: snappedY } : e);
      saveToHistory(newElements);
      setElements(newElements);
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

  function handleAlign(type: AlignType) {
    setElements((prev) => alignElements(prev, type, selectedIds, CANVAS_W, CANVAS_H));
  }

  const hasBackground = /__CERT_BACKGROUND__/.test(css);
  const canvasBg = extractBackgroundUrl(css);
  const selCount = selectedIds.length;

  const content = (
    <div className="flex gap-4">
      {!preview && onNameChange && onDescriptionChange && (
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-ios-sm)]">
            <label htmlFor="canvas-name" className="block text-sm font-semibold mb-2 text-[var(--color-text)]">
              Template Name
            </label>
            <input
              id="canvas-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              required
              placeholder="e.g. Certificate of Completion"
              className="input text-sm"
            />
            <label htmlFor="canvas-description" className="block text-sm font-semibold mb-2 mt-4 text-[var(--color-text)]">
              Description
            </label>
            <textarea
              id="canvas-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Optional description"
              rows={4}
              className="input text-sm resize-none"
            />
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        {!preview && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-ios-sm)]">
        <button
          type="button"
          onClick={addText}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-100)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] transition-all hover:bg-[var(--color-brand-200)] active:scale-[0.97]"
        >
          <PlusIcon className="size-3.5" />
          Text
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.97]"
        >
          <ImageIcon className="size-3.5" />
          Image
        </button>
        <button
          type="button"
          onClick={() => bgInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 transition-all hover:bg-purple-100 active:scale-[0.97]"
        >
          <PaletteIcon className="size-3.5" />
          Background
        </button>

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

        <button
          type="button"
          onClick={undo}
          disabled={historyIndex <= 0}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97] disabled:opacity-40"
          title="Undo (Ctrl/Cmd+Z)"
        >
          <Undo2Icon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97] disabled:opacity-40"
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          <Redo2Icon className="size-3.5" />
        </button>

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

        <button
          type="button"
          onClick={copySelection}
          disabled={selCount === 0}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97] disabled:opacity-40"
          title="Copy (Ctrl/Cmd+C)"
        >
          <CopyIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={paste}
          disabled={clipboardCount === 0}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97] disabled:opacity-40"
          title="Paste (Ctrl/Cmd+V)"
        >
          <ClipboardIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={selectEverything}
          disabled={elements.length === 0}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97] disabled:opacity-40"
          title="Select all (Ctrl/Cmd+A)"
        >
          <MousePointerIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={removeSelected}
          disabled={selCount === 0}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-danger-text)] transition-all hover:bg-[var(--color-danger-bg)] active:scale-[0.97] disabled:opacity-40"
          title="Delete (Del)"
        >
          <Trash2Icon className="size-3.5" />
        </button>

        {elements.length === 0 && (
          <>
            <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />
            <button
              type="button"
              onClick={() => seedStarter()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-[0.97]"
            >
              Starter Layout
            </button>
          </>
        )}

        {hasBackground && (
          <button
            type="button"
            onClick={clearBackground}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-danger-text)] transition-all hover:bg-[var(--color-danger-bg)] active:scale-[0.97]"
          >
            Clear BG
          </button>
        )}

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

        <div className="flex items-center gap-1.5">
          <select
            value={sizePreset}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "Custom") {
                setSizePreset("Custom");
              } else {
                setSizePreset(val);
              }
            }}
            className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none"
            title="Canvas size"
          >
            {SIZE_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} ({p.w}×{p.h})
              </option>
            ))}
            <option value="Custom">Custom</option>
          </select>
          {sizePreset === "Custom" && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={customW}
                onChange={(e) => setCustomW(Math.max(100, parseInt(e.target.value) || 100))}
                className="w-16 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] focus:border-[var(--color-brand-500)] focus:outline-none"
                min={100}
                title="Width (px)"
              />
              <span className="text-xs text-[var(--color-text-muted)]">×</span>
              <input
                type="number"
                value={customH}
                onChange={(e) => setCustomH(Math.max(100, parseInt(e.target.value) || 100))}
                className="w-16 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] focus:border-[var(--color-brand-500)] focus:outline-none"
                min={100}
                title="Height (px)"
              />
            </div>
          )}
        </div>

        <div className="flex gap-1 p-0.5 bg-[var(--color-surface-secondary)] rounded-lg">
          <button
            type="button"
            onClick={() => setOrientation("landscape")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              orientation === "landscape"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            Landscape
          </button>
          <button
            type="button"
            onClick={() => setOrientation("portrait")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              orientation === "portrait"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            Portrait
          </button>
        </div>

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

        <div className="flex gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
          <button
            type="button"
            onClick={() => handleAlign("left")}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            title="Align left edge"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/><line x1="21" y1="2" x2="3" y2="2"/></svg>
          </button>
          <button
            type="button"
            onClick={() => handleAlign("center-horizontal")}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            title="Align center horizontally"
          >
            <AlignHorizontalJustifyCenterIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign("right")}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            title="Align right edge"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/><line x1="21" y1="2" x2="3" y2="2"/></svg>
          </button>
          <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />
          <button
            type="button"
            onClick={() => handleAlign("top")}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            title="Align top edge"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="16" x="4" y="6" rx="2"/><rect width="6" height="9" x="14" y="6" rx="2"/><path d="M22 2H2"/></svg>
          </button>
          <button
            type="button"
            onClick={() => handleAlign("center-vertical")}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            title="Align center vertically"
          >
            <AlignVerticalJustifyCenterIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign("bottom")}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            title="Align bottom edge"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="16" x="4" y="2" rx="2"/><rect width="6" height="9" x="14" y="9" rx="2"/><path d="M22 22H2"/></svg>
          </button>
        </div>

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              snapEnabled
                ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
            title={snapEnabled ? "Disable snap to grid" : "Enable snap to grid"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z"/>
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              showGrid
                ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
            title={showGrid ? "Hide grid" : "Show grid"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          </button>
          {(snapEnabled || showGrid) && (
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none"
              title="Grid size"
            >
              <option value={10}>10px</option>
              <option value={20}>20px</option>
              <option value={25}>25px</option>
              <option value={50}>50px</option>
            </select>
          )}
          {guides.length > 0 && (
            <button
              type="button"
              onClick={() => setGuides([])}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-danger-text)] transition-all"
              title="Clear all guides"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}
        </div>

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

        <button
          type="button"
          onClick={() => onFullscreenChange?.(!fullscreen)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97]"
          title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
        >
          {fullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
          )}
          {fullscreen ? "Exit" : "Fullscreen"}
        </button>

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[var(--color-brand-700)] active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? "Saving..." : submitLabel}
        </button>

        <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

        <div className="flex flex-wrap items-center gap-1">
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
              className="rounded-lg bg-[var(--color-brand-100)] px-2 py-1 text-xs font-semibold text-[var(--color-brand-700)] transition-all hover:bg-[var(--color-brand-200)] active:scale-[0.97] disabled:opacity-40"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {selCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-ios-sm)]">
          <span className="px-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            {selCount} selected
          </span>

          <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

          <select
            value={firstSel?.fontFamily ?? ""}
            onChange={(e) => updateSelected({ fontFamily: e.target.value })}
            className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none"
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
            className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none"
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
            className="h-7 w-8 cursor-pointer rounded-lg border border-[var(--color-border-strong)] transition-all hover:border-[var(--color-brand-500)]"
            title="Text color"
          />
          <button
            type="button"
            onClick={() => updateSelected({ bold: !firstSel?.bold })}
            className={`inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
              firstSel?.bold
                ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            <BoldIcon className="size-3.5" />
          </button>

          <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

          <div className="flex gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
            {([
              { key: "left", icon: AlignLeftIcon },
              { key: "center", icon: AlignCenterIcon },
              { key: "right", icon: AlignRightIcon },
            ] as const).map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => updateSelected({ align: key })}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                  firstSel?.align === key
                    ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                }`}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>

          <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

          <button
            type="button"
            disabled={selCount === 0 || !elements.some((el) => isSelected(el.id) && el.type === "text")}
            onClick={fitSelectedToText}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-100)] px-2 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] transition-all hover:bg-[var(--color-brand-200)] active:scale-[0.97] disabled:opacity-40"
            title="Fit bounding box to text width"
          >
            <TypeIcon className="size-3.5" />
            Fit
          </button>

          <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

          <div className="flex gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
            <button
              type="button"
              onClick={bringSelectedToFront}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97]"
              title="Move to front"
            >
              <LayersIcon className="size-3.5" />
              Front
            </button>
            <button
              type="button"
              onClick={moveSelectedForward}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97]"
              title="Move forward one layer"
            >
              <ArrowUpIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={moveSelectedBackward}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97]"
              title="Move back one layer"
            >
              <ArrowDownIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={sendSelectedToBack}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97]"
              title="Move to back"
            >
              Back
            </button>
          </div>

          <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

          <button
            type="button"
            onClick={removeSelected}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-danger-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-danger-text)] transition-all hover:brightness-95 active:scale-[0.97]"
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </button>
        </div>
      )}

      {!preview && (
        <>
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
        </>
      )}

      <div
        className="cert-canvas overflow-auto rounded-md border bg-[var(--color-surface-secondary)] p-3"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{ maxHeight: fullscreen ? "calc(100vh - 80px)" : "calc(100vh - 320px)" }}
      >
        <div className="inline-block bg-[var(--color-surface)] p-1.5 rounded-lg shadow-sm">
          <Ruler 
            orientation="horizontal" 
            length={CANVAS_W} 
            onAddGuide={(pos) => setGuides(prev => [...prev, { orientation: 'horizontal', position: pos }])}
          />
          <div className="flex">
            <Ruler 
              orientation="vertical" 
              length={CANVAS_H}
              onAddGuide={(pos) => setGuides(prev => [...prev, { orientation: 'vertical', position: pos }])}
            />
            <div
              ref={canvasRef}
              className="relative shadow bg-white overflow-hidden"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                background: canvasBg
                  ? `url("${canvasBg}") center / cover no-repeat`
                  : "transparent",
              }}
              onMouseDown={handleCanvasMouseDown}
            >
              {showGrid && (
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(100,150,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,150,255,0.3) 1px, transparent 1px)`,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    mixBlendMode: 'difference',
                  }}
                />
              )}
              {activeAlignGuides.map((g, i) => (
                g.orientation === 'vertical' ? (
                  <div
                    key={`align-v-${i}-${g.position}`}
                    className="pointer-events-none absolute z-50"
                    style={{
                      left: g.position,
                      top: 0,
                      width: 1,
                      height: CANVAS_H,
                      backgroundColor: '#ff3366',
                    }}
                  />
                ) : (
                  <div
                    key={`align-h-${i}-${g.position}`}
                    className="pointer-events-none absolute z-50"
                    style={{
                      left: 0,
                      top: g.position,
                      width: CANVAS_W,
                      height: 1,
                      backgroundColor: '#ff3366',
                    }}
                  />
                )
              ))}
              {elements.map((el) => (
                <Rnd
                  key={el.id}
                  size={{ width: el.w, height: el.h }}
                  position={{ x: el.x, y: el.y }}
                  bounds="parent"
                  dragHandleClassName="cert-drag"
                  onDragStart={() => handleDragStart(el.id)}
                  onDrag={(_, d) => {
                    const guideResult = computeAlignmentGuides(el.id, d.x, d.y, el.w, el.h);
                    setActiveAlignGuides(guideResult.guides);
                  }}
                  onDragStop={(_, d) => {
                    setActiveAlignGuides([]);
                    handleDragStop(el.id, d);
                  }}
                  enableResizing={el.type === 'text' || el.type === 'qr' ? {
                    top: false,
                    right: true,
                    bottom: false,
                    left: true,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: false,
                    topLeft: false,
                  } : true}
                  onResizeStop={(_, __, ref, ___, pos) => {
                    const snappedW = snapEnabled ? Math.round(parseInt(ref.style.width, 10) / gridSize) * gridSize : parseInt(ref.style.width, 10);
                    const snappedX = snapValue(pos.x, 'vertical');
                    const snappedY = snapValue(pos.y, 'horizontal');
                    
                    let newElements: CanvasElement[];
                    if (el.type === 'qr') {
                      newElements = elements.map(e => e.id === el.id ? {
                        ...e,
                        w: snappedW,
                        h: snappedW,
                        x: snappedX,
                        y: snappedY,
                      } : e);
                    } else if (el.type === 'text') {
                      const calculatedH = calculateTextHeight(el.content, el.fontSize, snappedW);
                      newElements = elements.map(e => e.id === el.id ? {
                        ...e,
                        w: snappedW,
                        h: calculatedH,
                        x: snappedX,
                        y: snappedY,
                      } : e);
                    } else {
                      const snappedH = snapEnabled ? Math.round(parseInt(ref.style.height, 10) / gridSize) * gridSize : parseInt(ref.style.height, 10);
                      newElements = elements.map(e => e.id === el.id ? {
                        ...e,
                        w: snappedW,
                        h: snappedH,
                        x: snappedX,
                        y: snappedY,
                      } : e);
                    }
                    saveToHistory(newElements);
                    setElements(newElements);
                  }}
                  style={{ zIndex: el.z }}
                  onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                  className={`group ${
                    isSelected(el.id)
                      ? "ring-2 ring-blue-500"
                      : "ring-1 ring-transparent hover:ring-blue-300"
                  }`}
                >
                  <div className="relative h-full w-full">
                    {isSelected(el.id) && (() => {
                      const nearTop = el.y < 30;
                      const nearLeft = el.x < 80;
                      let handleClass = "cert-drag absolute z-10 flex cursor-move items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white";
                      
                      if (nearTop && nearLeft) {
                        handleClass += " top-0 right-0 translate-x-full";
                      } else if (nearTop) {
                        handleClass += " -bottom-6 left-0";
                      } else if (nearLeft) {
                        handleClass += " -top-6 right-0 translate-x-full";
                      } else {
                        handleClass += " -top-6 left-0";
                      }
                      
                      return (
                        <div className={handleClass}>
                          <span>⠿ drag</span>
                        </div>
                      );
                    })()}
                    {el.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={el.src}
                        alt=""
                        draggable={false}
                        className="cert-drag h-full w-full"
                        style={{ objectFit: "contain" }}
                      />
                    ) : el.type === 'qr' ? (
                      <div
                        className="cert-drag flex items-center justify-center h-full w-full text-xs text-gray-400"
                        style={{
                          fontSize: el.fontSize,
                          fontFamily: el.fontFamily,
                          color: el.color,
                          border: "2px dashed #ccc",
                          borderRadius: 4,
                          background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 50% / 12px 12px",
                        }}
                      >
                        QR
                      </div>
                    ) : (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newContent = e.currentTarget.innerHTML;
                          const newHeight = calculateTextHeight(newContent, el.fontSize, el.w);
                          update(el.id, { 
                            content: newContent,
                            h: newHeight
                          });
                        }}
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
              {guides.map((guide, idx) => (
                <div
                  key={idx}
                  className="pointer-events-none absolute z-40"
                  style={{
                    left: guide.orientation === 'vertical' ? guide.position : 0,
                    top: guide.orientation === 'horizontal' ? guide.position : 0,
                    width: guide.orientation === 'vertical' ? 1 : '100%',
                    height: guide.orientation === 'horizontal' ? 1 : '100%',
                    backgroundColor: '#ff0000',
                    opacity: 0.5,
                  }}
                />
              ))}
            </div>
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

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-surface)] p-2 gap-2">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {content}
    </div>
  );
});

export default TemplateCanvas;

function Ruler({
  orientation,
  length,
  onAddGuide,
}: {
  orientation: "horizontal" | "vertical";
  length: number;
  onAddGuide?: (position: number) => void;
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
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddGuide) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const position = orientation === "horizontal" 
      ? e.clientX - rect.left 
      : e.clientY - rect.top;
    onAddGuide(Math.round(position));
  };
  
  return (
    <div
      className="relative bg-gray-100 cursor-pointer"
      onClick={handleClick}
      title="Click to add guide line"
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
