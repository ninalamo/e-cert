import { sanitizeHtml } from "@/lib/utils";

/**
 * Extracts the canvas dimensions from the template's HTML content.
 * Looks for the `.certificate` div's inline width/height styles.
 */
export function extractCanvasDimensions(html: string): {
  width: number;
  height: number;
} {
  const wMatch = html.match(
    /class="certificate"[^>]*?width:\s*(\d+)px/
  );
  const hMatch = html.match(
    /class="certificate"[^>]*?height:\s*(\d+)px/
  );
  return {
    width: wMatch ? parseInt(wMatch[1], 10) : 1123,
    height: hMatch ? parseInt(hMatch[1], 10) : 794,
  };
}

/**
 * Extracts the QR element's dimensions from the template HTML.
 * Returns { w, h } of the first QR element, or null if none found.
 */
export function extractQrDimensions(html: string): {
  w: number;
  h: number;
} | null {
  const qrBlock = html.match(
    /position:\s*absolute[^"]*width:\s*(\d+)px[^"]*height:\s*(\d+)px[^"]*>\s*\{\{qr_code\}\}/
  );
  if (!qrBlock) return null;
  const w = parseInt(qrBlock[1], 10);
  const h = parseInt(qrBlock[2], 10);
  return { w: Math.max(w, h), h: Math.max(w, h) };
}

/**
 * Builds a QR code replacement img tag that fills its container,
 * matching the canvas editor's behavior (width:100%; height:100%; object-fit:contain).
 */
export function buildQrReplacement(qrDataUrl: string): string {
  return `<img src="${qrDataUrl}" style="width:100%;height:100%;object-fit:contain;" />`;
}

/**
 * Builds a complete HTML document for rendering a certificate template.
 * This is the single shared renderer used by all preview/viewer implementations.
 *
 * @param html - The template's html_content (may contain {{placeholders}})
 * @param css - The template's css_content
 * @param variables - Map of placeholder names to replacement values (e.g. { recipient_name: "Juan" })
 * @param options - Optional configuration
 */
export function buildCertificateSrcDoc(
  html: string,
  css: string,
  variables: Record<string, string> = {},
  options: {
    /** QR data URL to use for {{qr_code}} replacement. If not provided, a placeholder SVG is used. */
    qrDataUrl?: string;
    /** If true, render at actual pixel dimensions (for iframe). If false, let content flow. */
    fixedDimensions?: boolean;
  } = {}
): string {
  const { width, height } = extractCanvasDimensions(html);

  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    if (value) {
      rendered = rendered.replace(
        new RegExp(`\\{\\{${sanitizeHtml(key)}\\}\\}`, "g"),
        sanitizeHtml(value)
      );
    }
  }

  const qrReplacement = options.qrDataUrl
    ? buildQrReplacement(options.qrDataUrl)
    : '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50" y="55" text-anchor="middle" font-size="14" fill="#999">QR</text></svg>';

  rendered = rendered.replace(/\{\{qr_code\}\}/g, qrReplacement);

  const viewportMeta = options.fixedDimensions !== false
    ? `<meta name="viewport" content="width=${width}">`
    : `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;

  const sizingStyles = options.fixedDimensions !== false
    ? `html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;}`
    : `html,body{margin:0;padding:0;overflow:hidden;}`;

  return `<!DOCTYPE html>
<html>
<head>
  ${viewportMeta}
  <style>${sizingStyles}${css ?? ""}</style>
</head>
<body>
${rendered}
</body>
</html>`;
}

/**
 * Computes a uniform scale factor to fit a canvas within available space.
 * Never scales above 1 (no upscaling).
 */
export function computeUniformScale(
  canvasWidth: number,
  canvasHeight: number,
  availableWidth: number,
  availableHeight: number
): number {
  if (availableWidth <= 0 || availableHeight <= 0) return 1;
  return Math.min(1, availableWidth / canvasWidth, availableHeight / canvasHeight);
}
