import type { EmailBlock, EmailBlockType, BlockPropsMap, AnyEmailBlock, PlaceholderKey, EMAIL_PLACEHOLDER_FIELDS } from "./types";

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function esc(s: string): string {
  return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"");
}

function padStyle(top: number, right: number, bottom: number, left: number): string {
  return `padding:${top}px ${right}px ${bottom}px ${left}px;`;
}

export const DEFAULT_HEADER_PROPS: BlockPropsMap["header"] = {
  text: "Heading",
  level: "h1",
  color: "#18181b",
  align: "center",
  paddingTop: 16,
  paddingBottom: 16,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_TEXT_PROPS: BlockPropsMap["text"] = {
  content: "Your text content here.",
  color: "#27272a",
  fontSize: 16,
  align: "left",
  lineHeight: 1.6,
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_IMAGE_PROPS: BlockPropsMap["image"] = {
  src: "",
  alt: "Image",
  width: 100,
  align: "center",
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 24,
  paddingRight: 24,
};

export const DEFAULT_BUTTON_PROPS: BlockPropsMap["button"] = {
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

export const DEFAULT_DIVIDER_PROPS: BlockPropsMap["divider"] = {
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

export const DEFAULT_SPACER_PROPS: BlockPropsMap["spacer"] = {
  height: 32,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
};

export function defaultColumnsProps(): BlockPropsMap["columns"] {
  const col1Id = uid();
  const col2Id = uid();
  return {
    columnCount: 2,
    gap: 16,
    columns: [
      { id: col1Id, widthPercent: 50, blocks: [] },
      { id: col2Id, widthPercent: 50, blocks: [] },
    ],
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
      return `<td style="vertical-align:top;width:${col.widthPercent}%;padding:0 ${p.gap / 2}px;">${inner}</td>`;
    })
    .join("\n");

  return `<table role="presentation" style="width:100%;border-collapse:collapse;${padStyle(p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft)}"><tr>${colTds}</tr></table>`;
}

export function blockToHtml(block: AnyEmailBlock): string {
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

export function blocksToHtml(blocks: AnyEmailBlock[]): string {
  return blocks.filter((b) => !b.hidden).map(blockToHtml).join("\n");
}

export function getBlockLabel(block: AnyEmailBlock): string {
  switch (block.type) {
    case "header":
      return (block.props as BlockPropsMap["header"]).text || "Header";
    case "text": {
      const text = (block.props as BlockPropsMap["text"]).content.replace(/<[^>]*>/g, "").trim();
      return text.slice(0, 40) + (text.length > 40 ? "..." : "") || "Text";
    }
    case "image":
      return (block.props as BlockPropsMap["image"]).alt || "Image";
    case "button":
      return (block.props as BlockPropsMap["button"]).text || "Button";
    case "divider":
      return "Divider";
    case "spacer":
      return `Spacer (${(block.props as BlockPropsMap["spacer"]).height}px)`;
    case "columns":
      return `${(block.props as BlockPropsMap["columns"]).columnCount} Columns`;
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

export const BLOCK_COLORS: Record<EmailBlockType, string> = {
  header: "bg-blue-100 text-blue-700 border-blue-200",
  text: "bg-zinc-100 text-zinc-700 border-zinc-200",
  image: "bg-emerald-100 text-emerald-700 border-emerald-200",
  button: "bg-violet-100 text-violet-700 border-violet-200",
  divider: "bg-orange-50 text-orange-600 border-orange-200",
  spacer: "bg-slate-50 text-slate-400 border-slate-200",
  columns: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export function insertPlaceholder(text: string, placeholder: PlaceholderKey): string {
  return text + `{{${placeholder}}}`;
}

export function renderTemplateWithData(html: string, data: Record<PlaceholderKey, string>): string {
  return html
    .replace(/\{\{recipient_name\}\}/g, data.recipient_name)
    .replace(/\{\{certificate_number\}\}/g, data.certificate_number)
    .replace(/\{\{issued_date\}\}/g, data.issued_date)
    .replace(/\{\{download_url\}\}/g, data.download_url)
    .replace(/\{\{verify_url\}\}/g, data.verify_url)
    .replace(/\{\{org_name\}\}/g, data.org_name);
}

export const DEFAULT_EMAIL_TEMPLATE = `<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d4d4d8;font-family:Georgia,'Times New Roman',serif;">
  <div style="background-color:#18181b;padding:32px 24px;text-align:center;border-bottom:2px solid #a1a1aa;">
    <p style="color:#d4d4d8;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">{{org_name}}</p>
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:600;">Certificate Issued</h1>
  </div>
  <div style="padding:32px 24px;">
    <p style="color:#27272a;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear <strong>{{recipient_name}}</strong>,</p>
    <p style="color:#27272a;font-size:16px;line-height:1.6;margin:0 0 24px;">
      This is to confirm that your certificate has been officially issued. Please review the details below.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border:1px solid #e4e4e7;">
      <tr style="background-color:#fafafa;">
        <td style="padding:12px 16px;color:#71717a;font-size:14px;border-bottom:1px solid #e4e4e7;">Certificate Number</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;font-family:'Courier New',monospace;border-bottom:1px solid #e4e4e7;">{{certificate_number}}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#71717a;font-size:14px;">Date of Issue</td>
        <td style="padding:12px 16px;font-size:14px;">{{issued_date}}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="{{download_url}}" style="display:inline-block;background-color:#18181b;color:#ffffff;padding:14px 36px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">
        View Certificate
      </a>
    </div>
    <p style="color:#71717a;font-size:13px;text-align:center;margin:0 0 8px;">
      To verify the authenticity of this certificate, visit:<br/>
      <a href="{{verify_url}}" style="color:#18181b;font-size:13px;">{{verify_url}}</a>
    </p>
  </div>
  <div style="background-color:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
    <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">{{org_name}}</p>
    <p style="color:#a1a1aa;font-size:12px;margin:0;">
      This is an automated message. Please do not reply directly to this email.
    </p>
  </div>
</div>`;