import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderMarkdown } from "@/lib/markdown";

export default async function FaqContent() {
  const filePath = path.join(process.cwd(), "faq.md");
  const markdown = await readFile(filePath, "utf8");
  const content = renderMarkdown(markdown);

  return (
    <article className="app-card rounded-xl bg-surface p-6 sm:p-10">
      {content}
    </article>
  );
}
