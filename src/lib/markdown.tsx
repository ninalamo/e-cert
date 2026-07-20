import "server-only";

import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary"
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function renderTable(rows: string[]): ReactNode {
  const [headerLine, ...bodyLines] = rows;
  const parseRow = (line: string) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = parseRow(headerLine);
  const body = bodyLines
    .filter((line) => !/^\s*\|?[-:\s|]+\|?\s*$/.test(line))
    .map(parseRow);

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-muted">
            {headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-border px-3 py-2 text-left font-semibold text-primary"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="odd:bg-surface even:bg-background">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-b border-border px-3 py-2 text-tertiary"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderList(items: string[]): ReactNode {
  return (
    <ul className="my-3 list-disc space-y-1 pl-6 text-tertiary">
      {items.map((item, i) => (
        <li key={i}>{renderInline(item.replace(/^[-*]\s+/, ""))}</li>
      ))}
    </ul>
  );
}

/**
 * Minimal GitHub-flavored markdown renderer supporting the subset used by
 * faq.md: headings, paragraphs, blockquotes, tables, unordered lists, and
 * inline bold/code. Returns an array of React nodes.
 */
export function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="mt-8 text-lg font-semibold text-primary">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="mt-10 border-b border-border pb-2 text-xl font-bold text-primary">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="text-3xl font-extrabold text-primary">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-4 rounded-r-lg border-l-4 border-brand bg-surface-muted px-4 py-3 text-sm text-tertiary"
        >
          {renderInline(quote.join(" "))}
        </blockquote>
      );
      continue;
    }

    if (line.startsWith("|")) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableRows.push(lines[i]);
        i++;
      }
      blocks.push(<div key={key++}>{renderTable(tableRows)}</div>);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i]);
        i++;
      }
      blocks.push(<div key={key++}>{renderList(listItems)}</div>);
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("|") &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed text-tertiary">
        {renderInline(paragraph.join(" "))}
      </p>
    );
  }

  return blocks;
}
