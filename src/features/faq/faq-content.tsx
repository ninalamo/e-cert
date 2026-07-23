import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderMarkdown } from "@/lib/markdown";
import { requireSession } from "@/lib/permissions";

const HIDDEN_FOR_PARTICIPANT = ["## Admin", "## Staff"];
const HIDDEN_FLOWS_FOR_PARTICIPANT = [
  "### Issuing certificates (Admin / Staff)",
  "### Changing a user's role (Admin only)",
];
const ROLE_TABLE_ROWS_FOR_PARTICIPANT = ["| Admin", "| Staff", "| Guest"];

function filterMarkdown(markdown: string, role: string): string {
  if (role === "admin") return markdown;

  const isParticipant = role === "participant";

  if (!isParticipant) return markdown;

  const lines = markdown.split("\n");
  const filtered: string[] = [];
  let skipSection = false;
  let inRolesTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      skipSection = HIDDEN_FOR_PARTICIPANT.some((h) => line.startsWith(h));
      if (skipSection) continue;
    }

    if (line.startsWith("### ")) {
      if (HIDDEN_FLOWS_FOR_PARTICIPANT.some((h) => line.startsWith(h))) {
        skipSection = true;
        continue;
      }
      skipSection = false;
    }

    if (skipSection) continue;

    if (line.startsWith("| Role")) {
      inRolesTable = true;
    } else if (inRolesTable && line.startsWith("|---")) {
      filtered.push(line);
      continue;
    } else if (inRolesTable && line.startsWith("|")) {
      if (ROLE_TABLE_ROWS_FOR_PARTICIPANT.some((r) => line.startsWith(r))) {
        continue;
      }
    } else {
      inRolesTable = false;
    }

    filtered.push(line);
  }

  return filtered.join("\n");
}

export default async function FaqContent() {
  const session = await requireSession();
  const filePath = path.join(process.cwd(), "faq.md");
  const raw = await readFile(filePath, "utf8");
  const markdown = filterMarkdown(raw, session.role);
  const content = renderMarkdown(markdown);

  return (
    <article className="app-card rounded-xl bg-surface p-6 sm:p-10">
      {content}
    </article>
  );
}
