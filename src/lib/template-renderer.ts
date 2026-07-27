import { sanitizeHtml } from "@/lib/utils";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderTemplate(html: string, css: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "g"), sanitizeHtml(value));
  }
  return `<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
</head>
<body>
${rendered}
</body>
</html>`;
}
