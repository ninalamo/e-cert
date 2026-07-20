import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { renderMarkdown } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "FAQ · E-Cert",
  description: "Frequently asked questions about the E-Cert system.",
};

export default async function FaqPage() {
  const filePath = path.join(process.cwd(), "faq.md");
  const markdown = await readFile(filePath, "utf8");
  const content = renderMarkdown(markdown);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted light-override">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-primary">
            E-Cert
          </Link>
          <nav className="flex items-center gap-4 text-sm text-tertiary">
            <Link href="/verify" className="hover:text-brand">
              Verify
            </Link>
            <Link href="/login" className="font-medium text-brand hover:underline">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <article className="app-card rounded-xl bg-surface p-6 sm:p-10">
          {content}
        </article>

        <p className="mt-8 text-center text-sm text-tertiary">
          <Link href="/" className="font-medium text-brand hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
