import type {
  EmailBlock,
  EmailBlockType,
  HeaderBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SpacerBlockProps,
  ColumnsBlockProps,
  BlockPropsMap,
} from "./types";

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function padStyle(top: number, right: number, bottom: number, left: number): string {
  return `padding:${top}px ${right}px ${bottom}px ${left}px;`;
}

export const DEFAULT_HEADER_PROPS: HeaderBlockProps = {
  text: "Heading Text",
  level: "h1",
  color: "#18181b",
  align: "center",
  paddingTop: 16,
  paddingBottom: 16,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_TEXT_PROPS: TextBlockProps = {
  content: "Your text content here. Edit this block to change the text.",
  color: "#27272a",
  fontSize: 16,
  align: "left",
  lineHeight: 1.6,
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_IMAGE_PROPS: ImageBlockProps = {
  src: "",
  alt: "Image",
  width: 100,
  align: "center",
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_BUTTON_PROPS: ButtonBlockProps = {
  text: "View Certificate",
  href: "{{download_url}}",
  bgColor: "#18181b",
  textColor: "#ffffff",
  borderRadius: 0,
  align: "center",
  paddingTop: 16,
  paddingBottom: 16,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_DIVIDER_PROPS: DividerBlockProps = {
  color: "#e4e4e7",
  thickness: 1,
  style: "solid",
  widthPercent: 100,
  align: "center",
  paddingTop: 16,
  paddingBottom: 16,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_SPACER_PROPS: SpacerBlockProps = {
  height: 32,
};

export function defaultColumnsProps(): ColumnsBlockProps {
  const col1Id = uid();
  const col2Id = uid();
  return {
    columnCount: 2,
    columns: [
      { id: col1Id, widthPercent: 50, blocks: [] },
      { id: col2Id, widthPercent: 50, blocks: [] },
    ],
    gap: 16,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 24,
    paddingRight: 24,
  };
}

export const DEFAULT_PROPS: {
  [K in EmailBlockType]: BlockPropsMap[K];
} = {
  header: { ...DEFAULT_HEADER_PROPS },
  text: { ...DEFAULT_TEXT_PROPS },
  image: { ...DEFAULT_IMAGE_PROPS },
  button: { ...DEFAULT_BUTTON_PROPS },
  divider: { ...DEFAULT_DIVIDER_PROPS },
  spacer: { ...DEFAULT_SPACER_PROPS },
  columns: defaultColumnsProps(),
};

export function createBlock<T extends EmailBlockType>(
  type: T,
  props?: BlockPropsMap[T]
): EmailBlock<T> {
  return {
    id: uid(),
    type,
    props: props ?? { ...DEFAULT_PROPS[type] },
  };
}

function headerToHtml(block: EmailBlock<"header">): string {
  const p = block.props;
  const tag = p.level;
  const sizeMap = { h1: 28, h2: 22, h3: 18 };
  const size = sizeMap[p.level];
  return `<${tag} style="font-size:${size}px;font-weight:600;color:${esc(p.color)};margin:0;text-align:${p.align};${padStyle(p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft)}">${esc(p.text)}</${tag}>`;
}

function textToHtml(block: EmailBlock<"text">): string {
  const p = block.props;
  return `<p style="font-size:${p.fontSize}px;color:${esc(p.color)};line-height:${p.lineHeight};margin:0;text-align:${p.align};${padStyle(p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft)}">${p.content}</p>`;
}

function imageToHtml(block: EmailBlock<"image">): string {
  const p = block.props;
  if (!p.src) return "";
  const displayStyle = p.align === "center" ? "margin:0 auto;" : p.align === "right" ? "margin:0 0 0 auto;" : "margin:0;";
  return `<div style="text-align:${p.align};${padStyle(p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft)}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" style="width:${p.width}%;max-width:100%;display:inline-block;${displayStyle}" /></div>`;
}

function buttonToHtml(block: EmailBlock<"button">): string {
  const p = block.props;
  return `<div style="text-align:${p.align};${padStyle(p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft)}"><a href="${esc(p.href)}" style="display:inline-block;background-color:${esc(p.bgColor)};color:${esc(p.textColor)};padding:14px 36px;text-decoration:none;font-size:14px;font-weight:600;border-radius:${p.borderRadius}px;">${esc(p.text)}</a></div>`;
}

function dividerToHtml(block: EmailBlock<"divider">): string {
  const p = block.props;
  const w = p.widthPercent < 100 ? `width:${p.widthPercent}%;` : "";
  const mx = p.widthPercent < 100 ? (p.align === "center" ? "margin:0 auto;" : p.align === "right" ? "margin:0 0 0 auto;" : "margin:0;") : "";
  return `<div style="${padStyle(p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft)}"><hr style="border:none;border-top:${p.thickness}px ${p.style} ${esc(p.color)};${w}${mx}" /></div>`;
}

function spacerToHtml(block: EmailBlock<"spacer">): string {
  const h = block.props.height;
  return `<div style="height:${h}px;line-height:${h}px;font-size:1px;">&nbsp;</div>`;
}

function columnsToHtml(block: EmailBlock<"columns">): string {
  const p = block.props;
  const colTds = p.columns
    .map((col) => {
      const inner = col.blocks.map((b) => blockToHtml(b)).join("\n");
      return `<td style="vertical-align:top;width:${col.widthPercent}%;${esc(`padding:0 ${p.gap / 2}px;`)}">${inner}</td>`;
    })
    .join("\n");

  return `<table role="presentation" style="width:100%;border-collapse:collapse;${padStyle(p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft)}"><tr>${colTds}</tr></table>`;
}

export function blockToHtml(block: EmailBlock): string {
  switch (block.type) {
    case "header":
      return headerToHtml(block as EmailBlock<"header">);
    case "text":
      return textToHtml(block as EmailBlock<"text">);
    case "image":
      return imageToHtml(block as EmailBlock<"image">);
    case "button":
      return buttonToHtml(block as EmailBlock<"button">);
    case "divider":
      return dividerToHtml(block as EmailBlock<"divider">);
    case "spacer":
      return spacerToHtml(block as EmailBlock<"spacer">);
    case "columns":
      return columnsToHtml(block as EmailBlock<"columns">);
    default:
      return "";
  }
}

export function blocksToHtml(blocks: EmailBlock[]): string {
  return blocks.filter((b) => !b.hidden).map(blockToHtml).join("\n");
}

export function getBlockLabel(block: EmailBlock): string {
  switch (block.type) {
    case "header":
      return (block.props as HeaderBlockProps).text || "Header";
    case "text": {
      const text = (block.props as TextBlockProps).content.replace(/<[^>]*>/g, "").trim();
      return text.slice(0, 40) + (text.length > 40 ? "..." : "") || "Text";
    }
    case "image":
      return (block.props as ImageBlockProps).alt || "Image";
    case "button":
      return (block.props as ButtonBlockProps).text || "Button";
    case "divider":
      return "Divider";
    case "spacer":
      return `Spacer (${(block.props as SpacerBlockProps).height}px)`;
    case "columns":
      return `${(block.props as ColumnsBlockProps).columnCount} Columns`;
    default:
      return block.type;
  }
}

export const BLOCK_TYPE_LABELS: Record<EmailBlockType, string> = {
  header: "Header",
  text: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
  columns: "Columns",
};

export const BLOCK_TYPE_ICONS: Record<EmailBlockType, string> = {
  header: "H",
  text: "T",
  image: "I",
  button: "B",
  divider: "---",
  spacer: "↕",
  columns: "||",
};
