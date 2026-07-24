"use client";

import { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import { Rnd } from "react-rnd";
import QRCode from "qrcode";
import { PLACEHOLDER_FIELDS } from "./placeholder-field";
import {
  PlusIcon,
  MinusIcon,
  HelpCircleIcon,
  ImageIcon,
  PaletteIcon,
  CopyIcon,
  ClipboardIcon,
  MousePointerIcon,
  Trash2Icon,
  LayersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignVerticalJustifyCenterIcon,
  AlignJustifyIcon,
  Undo2Icon,
  Redo2Icon,
  TypeIcon,
  LockIcon,
  LockOpenIcon,
  XCircleIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  QrCodeIcon,
} from "lucide-react";
import TemplateSidebar from "./template-sidebar";
import ComponentsSidebar, { ComponentsSidebarItem } from "./components-sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
      dx = canvasW / 2 - (minX + bboxW / 2);
      break;
    case "center-vertical":
      dy = canvasH / 2 - (minY + bboxH / 2);
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
  align: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  paragraphSpacing?: number;
  locked?: boolean;
  hidden?: boolean;
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
  onSave?: () => void;
}

export interface TemplateCanvasHandle {
  getHtml: () => string;
  getCss: () => string;
  hasLocked: () => boolean;
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

function calculateTextHeight(content: string, fontSize: string, width: number, lineHeightRatio = 1.5, paragraphSpacing = 0): number {
  const size = parseInt(fontSize, 10) || 16;
  const lineHeight = size * lineHeightRatio;

  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = `${width}px`;
  tempDiv.style.fontSize = fontSize;
  tempDiv.style.lineHeight = `${lineHeight}px`;
  tempDiv.style.whiteSpace = 'normal';
  tempDiv.style.wordWrap = 'break-word';
  tempDiv.innerHTML = content;
  if (paragraphSpacing) {
    tempDiv.querySelectorAll('p').forEach((p) => {
      p.style.margin = `${paragraphSpacing}px 0`;
    });
  }
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

function getElementLabel(el: CanvasElement): string {
  if (el.type === "image") return "Image";
  if (el.type === "qr") return "QR Code";
  const text = el.content.replace(/<[^>]*>/g, "").trim();
  return text.slice(0, 40) || "Empty text";
}

function isPlaceholderElement(el: CanvasElement): boolean {
  if (el.type !== "text") return false;
  const text = el.content.replace(/<[^>]*>/g, "").trim();
  return /^\{\{.+\}\}$/.test(text);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function textToSimpleHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");
}

export function elementsToHtml(
  elements: CanvasElement[],
  width = 1123,
  height = 794,
  placeholderOverrides?: Record<string, string>
): string {
  const sorted = [...elements].filter((el) => !el.hidden).sort((a, b) => a.z - b.z);
  const blocks = sorted
    .map((el) => {
      const lockAttr = el.locked ? " data-locked=\"true\"" : "";
      const common = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};`;
      if (el.type === "image") {
        return `<div${lockAttr} style="${common}"><img src="${escapeAttr(
          el.src ?? ""
        )}" style="width:100%;height:100%;object-fit:contain;display:block;" /></div>`;
      }
      if (el.type === "qr") {
        const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};font-size:${el.fontSize};font-family:${escapeAttr(
          el.fontFamily
        )};color:${escapeAttr(el.color)};font-weight:${el.bold ? "bold" : "normal"};text-align:${el.align};overflow:hidden;`;
        return `<div${lockAttr} style="${style}">{{qr_code}}</div>`;
      }
      const lh = el.lineHeight ?? 1.5;
      const ps = el.paragraphSpacing ?? 0;
      let innerContent = el.content;
      if (placeholderOverrides) {
        for (const [key, val] of Object.entries(placeholderOverrides)) {
          if (val) innerContent = innerContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
        }
      }
      if (ps) {
        innerContent = innerContent.replace(/<p(\s[^>]*)?>/gi, (match, attrs) => {
          if (!attrs) return `<p style="margin:${ps}px 0;">`;
          if (/style="/.test(attrs)) {
            return `<p${attrs.replace(/style="/, `style="margin:${ps}px 0;`)}`;
          }
          return `<p${attrs} style="margin:${ps}px 0;">`;
        });
      }
      const fitFontSize = el.fontSize;
      const centerStyle = isPlaceholderElement(el)
        ? "display:flex;align-items:center;justify-content:center;text-align:center;white-space:normal;word-break:break-word;"
        : "";
      const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};font-size:${fitFontSize};font-family:${escapeAttr(
        el.fontFamily
      )};color:${escapeAttr(el.color)};font-weight:${el.bold ? "bold" : "normal"};text-align:${el.align};line-height:${lh};overflow:hidden;${centerStyle}`;
      return `<div${lockAttr} style="${style}">${innerContent}</div>`;
    })
    .join("\n");
  return `<div class="certificate" style="position:relative;width:${width}px;height:${height}px;overflow:hidden;">\n${blocks}\n</div>`;
}

function parseHtmlToElements(html: string): CanvasElement[] {
  if (!html || !html.includes("position:absolute")) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.querySelector(".certificate") ?? doc.body;
  const nodes = Array.from(root.children) as HTMLElement[];
  const out: CanvasElement[] = [];
  for (const n of nodes) {
    const style = n.getAttribute("style") ?? "";
    const locked = n.getAttribute("data-locked") === "true";
    const get = (re: RegExp) => {
      const m = style.match(re);
      return m ? m[1] : "";
    };
    const x = parseFloat(get(/left:([\d.]+)px/)) || 0;
    const y = parseFloat(get(/top:([\d.]+)px/)) || 0;
    const w = parseFloat(get(/width:([\d.]+)px/)) || 200;
    const h = parseFloat(get(/height:([\d.]+)px/)) || 60;
    const z = parseInt(get(/z-index:(\d+)/), 10) || 1;
    const img = n.querySelector("img");
    if (img) {
      out.push({
        id: uid(),
        type: "image",
        x, y, w, h, z, locked,
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
          x, y, w: Math.max(w, h), h: Math.max(w, h), z, locked,
          content: "{{qr_code}}",
          fontSize: get(/font-size:([^;]+)/) || "16px",
          fontFamily: get(/font-family:([^;]+)/) || "Arial, sans-serif",
          color: get(/color:([^;]+)/) || "#000000",
          bold: /font-weight:\s*bold/.test(style),
          align: (get(/text-align:([^;]+)/) as CanvasElement["align"]) || "center",
          lineHeight: parseFloat(get(/line-height:([^;]+)/)) || 1.5,
        });
      } else {
        out.push({
          id: uid(),
          type: "text",
          x, y, w, h, z, locked,
          content: innerHtml,
          fontSize: get(/font-size:([^;]+)/) || "16px",
          fontFamily: get(/font-family:([^;]+)/) || "Arial, sans-serif",
          color: get(/color:([^;]+)/) || "#000000",
          bold: /font-weight:\s*bold/.test(style),
          align: (get(/text-align:([^;]+)/) as CanvasElement["align"]) || "left",
          lineHeight: parseFloat(get(/line-height:([^;]+)/)) || 1.5,
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
      id: uid(), type: "qr", x: 440, y: 470, w: 160, h: 160, z: 8,
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
  onSave,
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
    hasLocked: () => elements.some((e) => e.locked),
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
  const [editingElement, setEditingElement] = useState<CanvasElement | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSrc, setEditSrc] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [componentsExpanded, setComponentsExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropSide, setDropSide] = useState<"before" | "after">("before");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

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

  // Sync elements → parent via useEffect
  const currentHtml = elementsToHtml(elements, CANVAS_W, CANVAS_H);
  const lastHtmlRef = useRef(currentHtml);
  useEffect(() => {
    if (currentHtml !== lastHtmlRef.current) {
      lastHtmlRef.current = currentHtml;
      onChange(currentHtml);
    }
  }, [currentHtml, onChange]);

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
        if (showPreview) { setShowPreview(false); return; }
        if (fullscreen) onFullscreenChange?.(false);
        setSelectedIds([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, onFullscreenChange, showPreview]);

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

  function handleListItemClick(id: string, e: React.MouseEvent) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      toggleSelect(id);
    } else {
      selectOnly(id);
    }
  }

  function openEditModal(el: CanvasElement) {
    setEditingElement(el);
    setEditContent(el.type === "text" ? stripHtml(el.content) : el.content);
    setEditSrc(el.src ?? "");
  }

  function handleSaveEdit() {
    if (!editingElement) return;
    if (editingElement.type === "text") {
      const htmlContent = textToSimpleHtml(editContent);
      const newHeight = calculateTextHeight(htmlContent, editingElement.fontSize, editingElement.w, editingElement.lineHeight ?? 1.5, editingElement.paragraphSpacing ?? 0);
      const newElements = elements.map(e => e.id === editingElement.id ? { ...e, content: htmlContent, h: newHeight } : e);
      saveToHistory(newElements);
      setElements(newElements);
    } else if (editingElement.type === "image") {
      const newElements = elements.map(e => e.id === editingElement.id ? { ...e, src: editSrc } : e);
      saveToHistory(newElements);
      setElements(newElements);
    }
    setEditingElement(null);
  }

  function toggleElementVisibility(id: string) {
    setElements((prev) => prev.map((e) => e.id === id ? { ...e, hidden: !e.hidden } : e));
  }

  function removeElement(id: string) {
    const newElements = elements.filter((e) => e.id !== id);
    saveToHistory(newElements);
    setElements(newElements);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function handleListDragStart(id: string, e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  }

  function handleListDragOver(id: string, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id === draggedId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropSide(e.clientY < midY ? "before" : "after");
    setDragOverId(id);
  }

  function handleListDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const sorted = [...elements].sort((a, b) => a.z - b.z);
    const draggedEl = sorted.find((e) => e.id === draggedId);
    const targetIdx = sorted.findIndex((e) => e.id === targetId);
    if (!draggedEl || targetIdx === -1) return;
    const withoutDragged = sorted.filter((e) => e.id !== draggedId);
    const newTargetIdx = withoutDragged.findIndex((e) => e.id === targetId);
    const insertIdx = dropSide === "before" ? newTargetIdx : newTargetIdx + 1;
    withoutDragged.splice(insertIdx, 0, draggedEl);
    const newElements = withoutDragged.map((el, i) => ({ ...el, z: i + 1 }));
    saveToHistory(newElements);
    setElements(newElements);
    setDraggedId(null);
    setDragOverId(null);
  }

  function handleListDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  function handleListMove(fromIndex: number, toIndex: number) {
    const sorted = [...elements].sort((a, b) => a.z - b.z);
    const newSorted = moveArrayItem(sorted, fromIndex, toIndex);
    const newElements = newSorted.map((el, i) => ({ ...el, z: i + 1 }));
    saveToHistory(newElements);
    setElements(newElements);
  }

  function moveArrayItem<T>(arr: T[], from: number, to: number): T[] {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  }

  function addText() {
    const z = elements.length ? Math.max(...elements.map((e) => e.z)) + 1 : 1;
    const w = 400;
    const h = 60;
    const el: CanvasElement = {
      id: uid(),
      type: "text",
      x: Math.round((CANVAS_W - w) / 2),
      y: Math.round((CANVAS_H - h) / 2),
      w,
      h,
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

  function addQr() {
    const z = elements.length ? Math.max(...elements.map((e) => e.z)) + 1 : 1;
    const size = 160;
    const el: CanvasElement = {
      id: uid(),
      type: "qr",
      x: Math.round((CANVAS_W - size) / 2),
      y: Math.round((CANVAS_H - size) / 2),
      w: size,
      h: size,
      z,
      content: "{{qr_code}}",
      fontSize: "14px",
      fontFamily: "Arial, sans-serif",
      color: "#000000",
      bold: false,
      align: "center",
    };
    const newElements = [...elements, el];
    saveToHistory(newElements);
    setElements(newElements);
    setSelectedIds([el.id]);
  }

  function addFieldText(fieldKey: string) {
    const z = elements.length ? Math.max(...elements.map((e) => e.z)) + 1 : 1;
    const content = `{{${fieldKey}}}`;
    const fontSize = "20px";
    const fontFamily = "Georgia, serif";
    const bold = false;
    const w = calculateTextWidth(content, fontSize, fontFamily, bold);
    const h = calculateTextHeight(content, fontSize, w);
    const el: CanvasElement = {
      id: uid(),
      type: "text",
      x: Math.round((CANVAS_W - w) / 2),
      y: Math.round((CANVAS_H - h) / 2),
      w,
      h,
      z,
      content,
      fontSize,
      fontFamily,
      color: "#1a1a1a",
      bold,
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
    const w = 200;
    const h = 200;
    const el: CanvasElement = {
      id: uid(),
      type: "image",
      x: Math.round((CANVAS_W - w) / 2),
      y: Math.round((CANVAS_H - h) / 2),
      w,
      h,
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
      if (!isSelected(el.id) || el.type !== 'text' || isPlaceholderElement(el)) return el;
      const newW = calculateTextWidth(el.content, el.fontSize, el.fontFamily, el.bold);
      const newH = calculateTextHeight(el.content, el.fontSize, newW, el.lineHeight ?? 1.5, el.paragraphSpacing ?? 0);
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

  const canvasPoint = useCallback((e: { clientX: number; clientY: number }): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

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
  }, [marquee, elements, canvasPoint]);

  function handleAlign(type: AlignType) {
    setElements((prev) => alignElements(prev, type, selectedIds, CANVAS_W, CANVAS_H));
  }

  const hasBackground = /__CERT_BACKGROUND__/.test(css);
  const canvasBg = extractBackgroundUrl(css);
  const selCount = selectedIds.length;
  const allSelectedLocked = selCount > 0 && elements.filter((e) => isSelected(e.id)).every((e) => e.locked);

  const componentItems: ComponentsSidebarItem[] = [...elements].sort((a, b) => a.z - b.z).map((el) => ({
    id: el.id,
    type: el.type,
    label: getElementLabel(el),
    icon: el.type === "text" ? "T" : el.type === "image" ? "I" : "QR",
    color: el.type === "text" ? "bg-blue-100 text-blue-700" : el.type === "image" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700",
    hidden: el.hidden,
    locked: el.locked,
  }));

const content = (
    <div className="flex gap-4 min-w-0">
      {onNameChange && onDescriptionChange && (
        <>
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="self-start mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-text-muted)] shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title={drawerOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronDownIcon className={`size-4 transition-transform ${drawerOpen ? "" : "-rotate-90"}`} />
          </button>
          {drawerOpen && (
            <div className="w-64 flex-shrink-0 flex flex-col gap-4 h-[calc(100vh-220px)] overflow-hidden">
<TemplateSidebar
                name={name}
                description={description}
                onNameChange={onNameChange}
                onDescriptionChange={onDescriptionChange}
                onPreview={() => setShowPreview(true)}
                fullscreen={fullscreen}
                onFullscreenChange={onFullscreenChange}
                onSave={onSave}
                onClose={() => {
                  if (window.confirm("Are you sure you want to close? Any unsaved changes will be lost.")) {
                    window.location.href = "/templates";
                  }
                }}
                loading={loading}
                disabled={disabled}
                submitLabel={submitLabel}
                expanded={sidebarExpanded}
                onExpandedChange={setSidebarExpanded}
              />
              <ComponentsSidebar
              items={componentItems}
              expanded={componentsExpanded}
              onExpandedChange={() => setComponentsExpanded((v) => !v)}
              selectedId={selectedIds.length === 1 ? selectedIds[0] : null}
              onSelect={handleListItemClick}
              onReorder={handleListMove}
              onToggleHidden={toggleElementVisibility}
              onToggleLocked={(id) => update(id, { locked: !elements.find(e => e.id === id)?.locked })}
              onDelete={setDeletingId}
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
</>
      )}
      <div className="flex-1 min-w-0">
        {!preview && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)] overflow-hidden">
            <div className="flex items-center gap-1 px-1.5 py-1 flex-wrap">
              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button type="button" onClick={addText} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-brand-700)] transition-all hover:bg-[var(--color-brand-100)] active:scale-[0.97]" title="Add text element">
                  <PlusIcon className="size-3" /> Text
                </button>
                <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.97]" title="Add image element">
                  <ImageIcon className="size-3" /> Image
                </button>
                <button type="button" onClick={addQr} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition-all hover:bg-violet-50 active:scale-[0.97]" title="Add QR code element">
                  <QrCodeIcon className="size-3" /> QR
                </button>
                <button type="button" onClick={() => bgInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-purple-700 transition-all hover:bg-purple-50 active:scale-[0.97]" title="Set background image">
                  <PaletteIcon className="size-3" /> BG
                </button>
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button type="button" onClick={undo} disabled={historyIndex <= 0} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Undo (Ctrl+Z)">
                  <Undo2Icon className="size-3.5" />
                </button>
                <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Redo (Ctrl+Shift+Z)">
                  <Redo2Icon className="size-3.5" />
                </button>
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button type="button" onClick={copySelection} disabled={selCount === 0} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Copy selected (Ctrl+C)">
                  <CopyIcon className="size-3.5" />
                </button>
                <button type="button" onClick={paste} disabled={clipboardCount === 0} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Paste from clipboard (Ctrl+V)">
                  <ClipboardIcon className="size-3.5" />
                </button>
                <button type="button" onClick={selectEverything} disabled={elements.length === 0} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Select all elements (Ctrl+A)">
                  <MousePointerIcon className="size-3.5" />
                </button>
                <button type="button" onClick={clearSelection} disabled={selCount === 0} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] active:scale-[0.97] disabled:opacity-40" title="Deselect all (Esc)">
                  <XCircleIcon className="size-3.5" />
                </button>
              </div>

              {elements.length === 0 && (
                <>
                  <div className="w-px h-4 bg-[var(--color-border)]" />
                  <button type="button" onClick={() => seedStarter()} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-[0.97]" title="Load starter template layout">
                    Starter Layout
                  </button>
                </>
              )}

              {hasBackground && (
                <>
                  <div className="w-px h-4 bg-[var(--color-border)]" />
                  <button type="button" onClick={clearBackground} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-danger-text)] transition-all hover:bg-[var(--color-danger-bg)] active:scale-[0.97]" title="Remove background image">
                    Clear BG
                  </button>
                </>
              )}

              <div className="w-px h-4 bg-[var(--color-border)]" />

              <div className="flex items-center gap-1">
                <select
                  value={sizePreset}
                  onChange={(e) => { const val = e.target.value; setSizePreset(val === "Custom" ? "Custom" : val); }}
                  className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1.5 py-1 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none"
                  title="Canvas size preset"
                >
                  {SIZE_PRESETS.map((p) => (
                    <option key={p.label} value={p.label}>{p.label}</option>
                  ))}
                  <option value="Custom">Custom</option>
                </select>
                {sizePreset === "Custom" && (
                  <div className="flex items-center gap-0.5">
                    <input type="number" value={customW} onChange={(e) => setCustomW(Math.max(100, parseInt(e.target.value) || 100))} className="w-14 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1.5 py-1 text-xs font-medium text-[var(--color-text)] focus:border-[var(--color-brand-500)] focus:outline-none" min={100} title="Custom width (px)" />
                    <span className="text-[10px] text-[var(--color-text-muted)]">×</span>
                    <input type="number" value={customH} onChange={(e) => setCustomH(Math.max(100, parseInt(e.target.value) || 100))} className="w-14 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1.5 py-1 text-xs font-medium text-[var(--color-text)] focus:border-[var(--color-brand-500)] focus:outline-none" min={100} title="Custom height (px)" />
                  </div>
                )}
                <div className="flex rounded-md bg-[var(--color-surface-secondary)] p-0.5">
                  <button type="button" onClick={() => setOrientation("landscape")} className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-all ${orientation === "landscape" ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`} title="Landscape orientation">L</button>
                  <button type="button" onClick={() => setOrientation("portrait")} className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-all ${orientation === "portrait" ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`} title="Portrait orientation">P</button>
                </div>
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button type="button" disabled={(selCount === 0 && elements.every((e) => e.locked)) || allSelectedLocked} onClick={() => handleAlign("left")} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40" title="Align left">
                  <AlignLeftIcon className="size-3.5" />
                </button>
                <button type="button" disabled={(selCount === 0 && elements.every((e) => e.locked)) || allSelectedLocked} onClick={() => handleAlign("center-horizontal")} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40" title="Align center horizontal">
                  <AlignHorizontalJustifyCenterIcon className="size-3.5" />
                </button>
                <button type="button" disabled={(selCount === 0 && elements.every((e) => e.locked)) || allSelectedLocked} onClick={() => handleAlign("right")} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40" title="Align right">
                  <AlignRightIcon className="size-3.5" />
                </button>
                <div className="w-px h-3.5 bg-[var(--color-border)]" />
                <button type="button" disabled={(selCount === 0 && elements.every((e) => e.locked)) || allSelectedLocked} onClick={() => handleAlign("top")} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40" title="Align top">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="16" x="4" y="6" rx="2" /><rect width="6" height="9" x="14" y="6" rx="2" /><path d="M22 2H2" /></svg>
                </button>
                <button type="button" disabled={(selCount === 0 && elements.every((e) => e.locked)) || allSelectedLocked} onClick={() => handleAlign("center-vertical")} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40" title="Align center vertical">
                  <AlignVerticalJustifyCenterIcon className="size-3.5" />
                </button>
                <button type="button" disabled={(selCount === 0 && elements.every((e) => e.locked)) || allSelectedLocked} onClick={() => handleAlign("bottom")} className="inline-flex items-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40" title="Align bottom">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="16" x="4" y="2" rx="2" /><rect width="6" height="9" x="14" y="9" rx="2" /><path d="M22 22H2" /></svg>
                </button>
              </div>

              <div className="w-px h-4 bg-[var(--color-border)]" />

              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button type="button" onClick={() => setSnapEnabled(!snapEnabled)} className={`rounded-md px-1.5 py-1 transition-all ${snapEnabled ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`} title={snapEnabled ? "Snap to grid: ON — click to disable" : "Snap to grid: OFF — click to enable"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
                </button>
                <button type="button" onClick={() => setShowGrid(!showGrid)} className={`rounded-md px-1.5 py-1 transition-all ${showGrid ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`} title={showGrid ? "Show grid: ON — click to hide" : "Show grid: OFF — click to show"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                </button>
                {(snapEnabled || showGrid) && (
                  <select value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1 py-0.5 text-[10px] font-medium text-[var(--color-text)] focus:border-[var(--color-brand-500)] focus:outline-none" title="Grid spacing size (px)">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                )}
                {guides.length > 0 && (
                  <button type="button" onClick={() => setGuides([])} className="rounded-md px-1 py-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger-text)] transition-all" title="Clear all guide lines">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                )}
                <div className="w-px h-3.5 bg-[var(--color-border)]" />
                <button type="button" onClick={() => setShowRulers(!showRulers)} className={`rounded-md px-1 py-1 transition-all ${showRulers ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`} title={showRulers ? "Rulers: ON — click to hide" : "Rulers: OFF — click to show"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3H3v7h18V3z"/><path d="M21 14H3v7h18v-7z"/></svg>
                </button>
              </div>

              {!fullscreen && (
                <>
                  <div className="ml-auto" />
                  <div className="w-px h-4 bg-[var(--color-border)]" />
                  <button type="button" onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-secondary)] active:scale-[0.97]" title="How to use — keyboard shortcuts & tools">
                    <HelpCircleIcon className="size-3.5" />
                  </button>
                  <div className="w-px h-4 bg-[var(--color-border)]" />
                  <button type="button" onClick={() => onFullscreenChange?.(true)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-secondary)] active:scale-[0.97]" title="Toggle fullscreen mode (Esc to exit)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                  </button>
                </>
              )}
            </div>

            {PLACEHOLDER_FIELDS.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/70 px-1.5 py-1.5">
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Placeholders
                </span>
                {PLACEHOLDER_FIELDS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => addFieldText(f.key)}
                    title={`Add {{${f.key}}} as a new text element`}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)] active:scale-[0.97]"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-ios-sm)]">
            <span className="px-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              {selCount} selected
            </span>

            <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />

            <div className="flex gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
              <button
                type="button"
                disabled={allSelectedLocked}
                onClick={bringSelectedToFront}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97] disabled:opacity-40"
                title="Bring to front (highest layer)"
              >
                <LayersIcon className="size-3.5" />
                Front
              </button>
              <button
                type="button"
                disabled={allSelectedLocked}
                onClick={moveSelectedForward}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97] disabled:opacity-40"
                title="Move forward one layer"
              >
                <ArrowUpIcon className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={allSelectedLocked}
                onClick={moveSelectedBackward}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97] disabled:opacity-40"
                title="Move backward one layer"
              >
                <ArrowDownIcon className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={allSelectedLocked}
                onClick={sendSelectedToBack}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] active:scale-[0.97] disabled:opacity-40"
                title="Send to back (lowest layer)"
              >
                Back
              </button>
            </div>
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
          className="cert-canvas overflow-auto rounded-md border bg-[var(--color-surface-secondary)] p-3 relative"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          style={{ maxHeight: fullscreen ? "calc(100vh - 80px)" : "calc(100vh - 320px)", cursor: panning ? "grabbing" : spaceHeld ? "grab" : undefined, userSelect: panning ? "none" : undefined }}
        >
          <div className="sticky top-0 right-0 z-50 flex justify-end pointer-events-none">
            <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] shadow-lg border border-[var(--color-border)] pointer-events-auto">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
                className="rounded-t-lg px-3 py-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                title="Zoom in (Ctrl++)"
              >
                <PlusIcon className="size-4" />
              </button>
              <div className="h-px w-full bg-[var(--color-border)]" />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
                className="rounded-b-lg px-3 py-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                title="Zoom out (Ctrl+-)"
              >
                <MinusIcon className="size-4" />
              </button>
              <div className="h-px w-full bg-[var(--color-border)]" />
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="rounded-b-lg px-3 py-1.5 text-[10px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors tabular-nums"
                title="Reset zoom (Ctrl+0)"
              >
                {Math.round(zoom * 100)}%
              </button>
            </div>
          </div>
          <div className="inline-flex items-center justify-center min-w-full min-h-full p-8">
            <div className="inline-block bg-[var(--color-surface)] p-4 rounded-lg shadow-sm" style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
            {showRulers && (
              <Ruler
                orientation="horizontal"
                length={CANVAS_W}
                onAddGuide={(pos) => setGuides(prev => [...prev, { orientation: 'horizontal', position: pos }])}
              />
            )}
            <div className="flex">
              {showRulers && (
                <Ruler
                  orientation="vertical"
                  length={CANVAS_H}
                  onAddGuide={(pos) => setGuides(prev => [...prev, { orientation: 'vertical', position: pos }])}
                />
              )}
              <div
                ref={canvasRef}
                className="relative shadow bg-white border border-[var(--color-border)]"
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
                {elements.filter((el) => !el.hidden).map((el) => (
                  <Rnd
                    key={el.id}
                    size={{ width: el.w, height: el.h }}
                    position={{ x: el.x, y: el.y }}
                    dragHandleClassName="cert-drag"
                    disableDragging={!!el.locked}
                    onDragStart={() => handleDragStart(el.id)}
                    onDrag={(_, d) => {
                      const guideResult = computeAlignmentGuides(el.id, d.x, d.y, el.w, el.h);
                      setActiveAlignGuides(guideResult.guides);
                    }}
                    onDragStop={(_, d) => {
                      setActiveAlignGuides([]);
                      handleDragStop(el.id, d);
                    }}
                    enableResizing={el.locked || isPlaceholderElement(el) ? false : (el.type === 'text' || el.type === 'qr' ? {
                      top: false,
                      right: true,
                      bottom: false,
                      left: true,
                      topRight: false,
                      bottomRight: false,
                      bottomLeft: false,
                      topLeft: false,
                    } : true)}
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
                        const calculatedH = calculateTextHeight(el.content, el.fontSize, snappedW, el.lineHeight ?? 1.5, el.paragraphSpacing ?? 0);
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
                    className={`group ${el.locked
                        ? "ring-2 ring-amber-400 opacity-80"
                        : isSelected(el.id)
                          ? "ring-2 ring-blue-500"
                          : "ring-1 ring-transparent hover:ring-blue-300"
                      }`}
                  >
                    <div className="relative h-full w-full">
                      {el.locked && (
                        <div className="absolute -top-5 left-0 z-10 flex items-center gap-0.5 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          <LockIcon className="size-2.5" />
                          locked
                        </div>
                      )}
                      {isSelected(el.id) && !el.locked && (() => {
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
                          contentEditable={!el.locked && !isPlaceholderElement(el)}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newContent = e.currentTarget.innerHTML;
                            const newHeight = calculateTextHeight(newContent, el.fontSize, el.w, el.lineHeight ?? 1.5, el.paragraphSpacing ?? 0);
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
                            lineHeight: String(el.lineHeight ?? 1.5),
                            overflow: "hidden",
                            outline: "none",
                            cursor: "text",
                            ...(isPlaceholderElement(el) ? {
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center" as const,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                            } : {}),
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
      </div>

      {!preview && selCount > 0 && (
        <aside className="w-72 flex-shrink-0">
          <div className="sticky top-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-ios-sm)]">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Properties</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{selCount} selected</p>
                </div>
                <span className="rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
                  {firstSel?.type ?? "item"}
                </span>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Text</label>
                <select
                  value={firstSel?.fontFamily ?? ""}
                  onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                  disabled={allSelectedLocked || firstSel?.type !== "text"}
                  className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:opacity-40"
                  title="Font family"
                >
                  <option value="">Font</option>
                  {FONT_FAMILIES.map((f) => (
                    <option key={f} value={f}>{f.split(",")[0]}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <select
                    value={firstSel?.fontSize ?? ""}
                    onChange={(e) => updateSelected({ fontSize: e.target.value })}
                    disabled={allSelectedLocked || firstSel?.type !== "text"}
                    className="flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:opacity-40"
                    title="Font size"
                  >
                    <option value="">Size</option>
                    {FONT_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={firstSel?.color ?? "#000000"}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                    disabled={allSelectedLocked || firstSel?.type !== "text"}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--color-border-strong)] transition-all hover:border-[var(--color-brand-500)] disabled:opacity-40"
                    title="Text color"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Layout</label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: "left", icon: AlignLeftIcon, label: "Left" },
                    { key: "center", icon: AlignCenterIcon, label: "Center" },
                    { key: "right", icon: AlignRightIcon, label: "Right" },
                    { key: "justify", icon: AlignJustifyIcon, label: "Justify" },
                  ] as const).map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      disabled={allSelectedLocked || firstSel?.type !== "text"}
                      onClick={() => updateSelected({ align: key })}
                      title={label}
                      className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 ${firstSel?.align === key ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"}`}
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Spacing</label>
                <select
                  value={firstSel?.lineHeight ?? 1.5}
                  onChange={(e) => updateSelected({ lineHeight: parseFloat(e.target.value) })}
                  disabled={allSelectedLocked || firstSel?.type !== "text"}
                  className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:opacity-40"
                  title="Line height"
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((val) => (
                    <option key={val} value={val}>{val.toFixed(val % 1 === 0 ? 0 : 2)}</option>
                  ))}
                </select>
                <select
                  value={firstSel?.paragraphSpacing ?? 0}
                  onChange={(e) => updateSelected({ paragraphSpacing: parseInt(e.target.value) })}
                  disabled={allSelectedLocked || firstSel?.type !== "text"}
                  className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:opacity-40"
                  title="Paragraph spacing"
                >
                  {[0, 2, 4, 6, 8, 10, 12, 16, 20, 24].map((val) => (
                    <option key={val} value={val}>{val}px</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                {firstSel?.type === "text" && (
                  <button
                    type="button"
                    disabled={selCount === 0 || allSelectedLocked || isPlaceholderElement(firstSel)}
                    onClick={fitSelectedToText}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-100)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] transition-all hover:bg-[var(--color-brand-200)] active:scale-[0.97] disabled:opacity-40"
                    title="Fit bounding box to text content"
                  >
                    <TypeIcon className="size-3.5" />
                    Fit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => updateSelected({ locked: !elements.filter((e) => isSelected(e.id)).some((e) => e.locked) })}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${elements.filter((e) => isSelected(e.id)).every((e) => e.locked) ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"}`}
                >
                  {elements.filter((e) => isSelected(e.id)).every((e) => e.locked) ? <LockIcon className="size-3.5" /> : <LockOpenIcon className="size-3.5" />}
                  {elements.filter((e) => isSelected(e.id)).every((e) => e.locked) ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  onClick={removeSelected}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-danger-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-danger-text)] transition-all hover:bg-[var(--color-danger-bg)] active:scale-[0.97]"
                >
                  <Trash2Icon className="size-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

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

  const editModal = (
    <Dialog open={!!editingElement} onOpenChange={(open) => { if (!open) setEditingElement(null); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit {editingElement?.type === "text" ? "Text" : editingElement?.type === "image" ? "Image" : "QR Code"}
          </DialogTitle>
          <DialogDescription>
            {editingElement && getElementLabel(editingElement)}
          </DialogDescription>
        </DialogHeader>
        {editingElement?.type === "text" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                Content
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)] focus:outline-none resize-y"
              />
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">Preview</p>
              <div
                className="text-sm leading-relaxed"
                style={{
                  fontSize: editingElement.fontSize,
                  fontFamily: editingElement.fontFamily,
                  color: editingElement.color,
                  fontWeight: editingElement.bold ? "bold" : "normal",
                  textAlign: editingElement.align,
                }}
                dangerouslySetInnerHTML={{ __html: editContent }}
              />
            </div>
          </div>
        )}
        {editingElement?.type === "image" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                Image Source
              </label>
              <input
                value={editSrc}
                onChange={(e) => setEditSrc(e.target.value)}
                placeholder="Enter image URL or data URL"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)] focus:outline-none"
              />
            </div>
            {editSrc && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
                <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">Preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editSrc} alt="Preview" className="max-h-40 rounded object-contain" />
              </div>
            )}
          </div>
        )}
        {editingElement?.type === "qr" && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 text-center text-sm text-[var(--color-text-muted)]">
            QR Code content is automatically generated from template data.
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingElement(null)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={editingElement?.locked}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const deleteConfirmDialog = (
    <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Component</DialogTitle>
          <DialogDescription>
            {deletingId && (() => {
              const el = elements.find((e) => e.id === deletingId);
              return el ? <>Are you sure you want to delete <strong>{getElementLabel(el)}</strong>?</> : null;
            })()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { if (deletingId) { removeElement(deletingId); setDeletingId(null); } }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (showPreview) {
      QRCode.toDataURL("https://e-cert.example.com/verify/CERT-000001", {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      }).then((url) => setQrDataUrl(url));
    }
  }, [showPreview]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !e.repeat && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setSpaceHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        setSpaceHeld(false);
        setPanning(false);
        isPanning.current = false;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!spaceHeld) return;
    const el = canvasRef.current;
    if (!el) return;
    const container = el.closest(".cert-canvas") as HTMLElement | null;
    if (!container) return;

    function onMouseDown(e: MouseEvent) {
      if (!spaceHeld) return;
      isPanning.current = true;
      setPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container!.scrollLeft,
        scrollTop: container!.scrollTop,
      };
    }
    function onMouseMove(e: MouseEvent) {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      container!.scrollLeft = panStart.current.scrollLeft - dx;
      container!.scrollTop = panStart.current.scrollTop - dy;
    }
    function onMouseUp() {
      isPanning.current = false;
      setPanning(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [spaceHeld]);

  useEffect(() => {
    const container = canvasRef.current?.closest(".cert-canvas") as HTMLElement | null;
    if (!container) return;

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) => Math.min(5, Math.max(0.1, z + delta)));
      }
    }
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "=" || key === "+") {
        e.preventDefault();
        setZoom((z) => Math.min(5, z + 0.1));
      } else if (key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(0.1, z - 0.1));
      } else if (key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const previewDates = useMemo(() => {
    const now = new Date();
    return {
      issued: now.toLocaleDateString(),
      expiry: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    };
  }, []);

  const defaultPreviewValues: Record<string, string> = useMemo(() => ({
    recipient_name: "Juan Dela Cruz",
    certificate_number: "CERT-000001",
    issued_date: previewDates.issued,
    organization_name: "Sample Organization",
    event_name: "Sample Event",
    event_date: new Date().toLocaleDateString(),
    event_location: "Sample Location",
    event_organizer: "Sample Organizer",
    certificate_title: "Certificate of Achievement",
    expiry_date: previewDates.expiry,
  }), [previewDates]);

  const mergedPreviewValues = useMemo(() => {
    const merged = { ...defaultPreviewValues };
    for (const [k, v] of Object.entries(previewValues)) {
      if (v.trim()) merged[k] = v.trim();
    }
    return merged;
  }, [defaultPreviewValues, previewValues]);

  const previewModal = showPreview ? (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center gap-4 p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={() => setShowPreview(false)}
    >
      <button
        type="button"
        onClick={() => setShowPreview(false)}
        className="fixed top-4 right-4 z-[201] flex items-center justify-center w-10 h-10 rounded-full bg-white/90 border border-gray-200 text-gray-500 shadow-lg transition-all hover:bg-white hover:text-gray-700 hover:shadow-xl active:scale-[0.95]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      <div
        className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-4 overflow-y-auto"
        style={{ maxHeight: "85vh", width: 280, minWidth: 240 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Preview Data</h3>
          <button
            type="button"
            onClick={() => setPreviewValues({})}
            className="text-[10px] font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors"
          >
            Reset
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] -mt-1 mb-1">
          Leave empty to use default values.
        </p>
        <div className="space-y-2.5">
          {PLACEHOLDER_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`preview-${f.key}`} className="block text-[10px] font-semibold text-[var(--color-text-secondary)] mb-0.5">
                {f.label}
              </label>
              <input
                id={`preview-${f.key}`}
                type="text"
                value={previewValues[f.key] ?? ""}
                onChange={(e) => setPreviewValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={defaultPreviewValues[f.key]}
                className="w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="bg-white shadow-2xl rounded-lg overflow-hidden flex-shrink-0"
        style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "65vw", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: elementsToHtml(elements, CANVAS_W, CANVAS_H, mergedPreviewValues)
              .replace(/\{\{qr_code\}\}/g, qrDataUrl ? `<img src="${qrDataUrl}" style="width:100%;height:100%;object-fit:contain;" />` : '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#fff"/></svg>'),
          }}
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            background: canvasBg
              ? `url("${canvasBg}") center / cover no-repeat`
              : "transparent",
          }}
        />
      </div>
    </div>
  ) : null;

  const helpModal = showHelp ? (
    <Dialog open onOpenChange={() => setShowHelp(false)}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to Use</DialogTitle>
          <DialogDescription>Keyboard shortcuts and tools reference</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <Section title="Navigation">
            <Row keys={["Space + Drag"]} desc="Pan / move the canvas around" />
            <Row keys={["Ctrl + Scroll"]} desc="Zoom in / out" />
            <Row keys={["Ctrl + +"]} desc="Zoom in" />
            <Row keys={["Ctrl + -"]} desc="Zoom out" />
            <Row keys={["Ctrl + 0"]} desc="Reset zoom to 100%" />
          </Section>
          <Section title="Selection">
            <Row keys={["Click"]} desc="Select element" />
            <Row keys={["Shift + Click"]} desc="Toggle add/remove from selection" />
            <Row keys={["Ctrl + A"]} desc="Select all elements" />
            <Row keys={["Esc"]} desc="Deselect all / close modal / exit fullscreen" />
            <Row keys={["Drag on canvas"]} desc="Marquee select multiple elements" />
          </Section>
          <Section title="Editing">
            <Row keys={["Double-click"]} desc="Edit text / image / QR content" />
            <Row keys={["Del / Backspace"]} desc="Delete selected elements" />
            <Row keys={["Ctrl + C"]} desc="Copy selected elements" />
            <Row keys={["Ctrl + V"]} desc="Paste from clipboard" />
            <Row keys={["Ctrl + D"]} desc="Duplicate selected elements" />
            <Row keys={["Ctrl + Z"]} desc="Undo" />
            <Row keys={["Ctrl + Shift+Z"]} desc="Redo" />
          </Section>
          <Section title="Canvas">
            <Row keys={["Drag handles"]} desc="Resize selected element" />
            <Row keys={["Drag ⠿ label"]} desc="Move selected element" />
            <Row keys={["Rulers"]} desc="Click ruler to add guide line" />
            <Row keys={["Grid + Snap"]} desc="Toggle in toolbar for alignment" />
          </Section>
          <Section title="Canvas Bleed">
            <Row keys={["Drag beyond edge"]} desc="Elements can be placed outside the canvas (bleed area)" />
            <Row keys={["Final output"]} desc="HTML output is clipped to canvas size" />
          </Section>
          <Section title="Toolbar Tools">
            <Row keys={["Insert"]} desc="Add text, image, or QR code (centered on canvas)" />
            <Row keys={["Placeholders"]} desc="Add placeholder fields ({{name}}, {{date}}, etc.)" />
            <Row keys={["Arrange"]} desc="Reorder layers (front, forward, backward, back)" />
            <Row keys={["Lock"]} desc="Lock/unlock selected elements" />
            <Row keys={["Hide"]} desc="Show/hide elements (hidden excluded from output)" />
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-surface)] p-2 gap-2">
        {content}
        {editModal}
        {deleteConfirmDialog}
        {previewModal}
        {helpModal}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {content}
      {editModal}
      {deleteConfirmDialog}
      {previewModal}
      {helpModal}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 flex-shrink-0 min-w-[140px] justify-end">
        {keys.map((k) => (
          <kbd key={k} className="inline-block rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--color-text)]">{k}</kbd>
        ))}
      </div>
      <span className="text-[var(--color-text-secondary)]">{desc}</span>
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
