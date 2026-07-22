"use client";

import { useState, useCallback, useMemo, useEffect, startTransition } from "react";
import Link from "next/link";
import {
  getTemplatesAction,
  deleteTemplateAction,
} from "@/features/templates/server/template.actions";
import type { CertificateTemplate } from "@/types/template";

type TemplateRow = CertificateTemplate & { locked: boolean };
import { ORG_ID } from "@/lib/org";
import { usePagination, Paginator } from "@/components/ui/paginator";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon, Trash2Icon, SearchIcon, InfoIcon } from "lucide-react";

type FilterKey = "all" | "with-description" | "without-description";
type SortKey = "name-asc" | "name-desc" | "created-desc" | "created-asc";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "with-description", label: "With description" },
  { key: "without-description", label: "No description" },
];

export default function TemplatesTable() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort] = useState<SortKey>("created-desc");
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const data = await getTemplatesAction(ORG_ID);
    setTemplates(data);
    setLoaded(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => {
      loadTemplates();
    });
  }, [loadTemplates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = templates.filter((t) => {
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q);
      const matchesFilter =
        filter === "all" ||
        (filter === "with-description" && !!t.description) ||
        (filter === "without-description" && !t.description);
      return matchesQuery && matchesFilter;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "created-asc":
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          );
        case "created-desc":
        default:
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
      }
    });
    return list;
  }, [templates, query, filter, sort]);

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } =
    usePagination(filtered, 10);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteTemplateAction(deleteTarget.id);
    setDeleting(false);
    if (result?.error) {
      alert(result.error);
    } else {
      loadTemplates();
      setPage(0);
      setDeleteTarget(null);
    }
  }

  function closePreview() {
    setPreviewTemplate(null);
    setPreviewScale(1);
  }

  const { certW, certH } = useMemo(() => {
    if (!previewTemplate) return { certW: 1123, certH: 794 };
    const html = previewTemplate.html_content ?? "";
    const wMatch = html.match(/width:\s*([\d.]+)px/);
    const hMatch = html.match(/height:\s*([\d.]+)px/);
    return {
      certW: wMatch ? parseFloat(wMatch[1]) : 1123,
      certH: hMatch ? parseFloat(hMatch[1]) : 794,
    };
  }, [previewTemplate]);

  useEffect(() => {
    if (!previewTemplate) return;
    function calc() {
      const padX = 32;
      const padY = 120;
      const maxW = window.innerWidth - padX * 2;
      const maxH = window.innerHeight - padY;
      setPreviewScale(Math.min(1, maxW / certW, maxH / certH));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [previewTemplate, certW, certH]);

  const previewSrcDoc = previewTemplate ? buildPreviewSrcDoc(previewTemplate) : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link href="/templates/new" className="btn-brand">
          <PlusIcon className="size-4" />
          New Template
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search templates..."
            className="input pl-8 py-1.5 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                  setPage(0);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white"
                    : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-tertiary hover:border-[var(--color-brand-300)]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setPage(0);
              }}
              className="text-xs text-tertiary hover:text-secondary cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && <SkeletonTable rows={5} />}

      {!loading && loaded && filtered.length === 0 && (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">
            {templates.length === 0
              ? "No templates yet. Create your first one."
              : "No templates match your search."}
          </p>
        </div>
      )}

      {!loading && loaded && filtered.length > 0 && (
        <div className="app-card divide-y divide-border overflow-hidden">
          {paginatedItems.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/templates/${t.id}`}
                  className="font-medium text-[var(--color-text)] hover:underline"
                >
                  {t.name}
                </Link>
                <p className="mt-0.5 truncate text-xs text-tertiary">
                  {t.description || "No description"}
                  {" · "}
                  {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {t.locked ? (
                  <span
                    title="Locked: used by an active or archived event. Archive the linked event(s) to edit."
                    className="status-pill status-archive"
                  >
                    Locked
                  </span>
                ) : (
                  <span className="status-pill status-active">Editable</span>
                )}
                {/* <button
                  onClick={() => setPreviewTemplate(t)}
                  className="btn-disclosure"
                >
                  Preview
                </button> */}
                {t.locked ? (
                  <span
                    title="Locked: used by an active or archived event"
                    className="btn-icon opacity-50 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <SearchIcon className="size-4" />
                  </span>
                ) : (
                  <Link href={`/templates/${t.id}`} className="btn-disclosure">
                    Edit
                  </Link>
                )}
                {!t.locked ? (
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="btn-icon btn-icon-danger"
                    title="Delete template"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                ) : (
                  <span
                    title="Locked: used by an active or archived event"
                    className="btn-icon"
                    aria-disabled="true"
                  >
                    <Trash2Icon className="size-4" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <Paginator
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          setPage={setPage}
          setPageSize={(s) => {
            setPageSize(s);
          }}
        />
      )}

      {previewTemplate && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20 ios-blur-heavy"
            onClick={closePreview}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="relative pointer-events-auto bg-white rounded-2xl shadow-ios-xl overflow-hidden ios-blur flex flex-col">
              <div className="p-3 border-b border-default flex items-center justify-between bg-white/80 shrink-0">
                <span className="text-sm font-semibold text-[var(--color-text)]">{previewTemplate.name}</span>
                <button
                  onClick={closePreview}
                  className="btn-icon"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div
                className="relative bg-white overflow-hidden"
                style={{ width: `${certW * previewScale}px`, height: `${certH * previewScale}px` }}
              >
                <iframe
                  srcDoc={previewSrcDoc}
                  className="border-0 block"
                  title="Template Preview"
                  style={{
                    width: `${certW}px`,
                    height: `${certH}px`,
                    transformOrigin: "top left",
                    transform: `scale(${previewScale})`,
                  }}
                />
              </div>
              <div className="p-3 border-t border-default flex items-center justify-between bg-white/80 shrink-0">
                <span className="text-xs text-tertiary">
                  {previewTemplate.description || "No description"}
                </span>
                <Link
                  href={`/templates/${previewTemplate.id}`}
                  className="btn-brand text-xs px-4 py-2"
                >
                  Edit Template
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
            <p className="text-[var(--color-danger-text)]">
              This will permanently delete the template. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildPreviewSrcDoc(template: CertificateTemplate): string {
  const replacements = {
    "{{recipient_name}}": "Juan Dela Cruz",
    "{{certificate_number}}": "CERT-000001",
    "{{issued_date}}": new Date().toLocaleDateString(),
    "{{organization_name}}": "Sample Organization",
  };
  let content = template.html_content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  content = content.replace(/\{\{qr_code\}\}/g, '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><g fill="#000"><rect x="5" y="5" width="25" height="25"/><rect x="10" y="10" width="15" height="15" fill="#fff"/><rect x="13" y="13" width="9" height="9"/><rect x="70" y="5" width="25" height="25"/><rect x="75" y="10" width="15" height="15" fill="#fff"/><rect x="78" y="13" width="9" height="9"/><rect x="5" y="70" width="25" height="25"/><rect x="10" y="75" width="15" height="15" fill="#fff"/><rect x="13" y="78" width="9" height="9"/><rect x="35" y="5" width="5" height="5"/><rect x="45" y="5" width="5" height="5"/><rect x="55" y="5" width="5" height="5"/><rect x="35" y="15" width="5" height="5"/><rect x="50" y="15" width="5" height="5"/><rect x="60" y="15" width="5" height="5"/><rect x="35" y="25" width="5" height="5"/><rect x="45" y="25" width="5" height="5"/><rect x="55" y="35" width="5" height="5"/><rect x="40" y="40" width="5" height="5"/><rect x="50" y="40" width="5" height="5"/><rect x="60" y="40" width="5" height="5"/><rect x="35" y="50" width="5" height="5"/><rect x="45" y="50" width="5" height="5"/><rect x="55" y="50" width="5" height="5"/><rect x="5" y="35" width="5" height="5"/><rect x="5" y="45" width="5" height="5"/><rect x="15" y="40" width="5" height="5"/><rect x="25" y="35" width="5" height="5"/><rect x="25" y="45" width="5" height="5"/><rect x="5" y="55" width="5" height="5"/><rect x="15" y="60" width="5" height="5"/><rect x="25" y="55" width="5" height="5"/><rect x="35" y="60" width="5" height="5"/><rect x="45" y="55" width="5" height="5"/><rect x="55" y="55" width="5" height="5"/><rect x="65" y="35" width="5" height="5"/><rect x="75" y="35" width="5" height="5"/><rect x="85" y="35" width="5" height="5"/><rect x="70" y="45" width="5" height="5"/><rect x="80" y="45" width="5" height="5"/><rect x="90" y="45" width="5" height="5"/><rect x="65" y="55" width="5" height="5"/><rect x="75" y="60" width="5" height="5"/><rect x="85" y="55" width="5" height="5"/><rect x="35" y="70" width="5" height="5"/><rect x="45" y="75" width="5" height="5"/><rect x="55" y="70" width="5" height="5"/><rect x="40" y="85" width="5" height="5"/><rect x="50" y="80" width="5" height="5"/><rect x="60" y="85" width="5" height="5"/><rect x="70" y="70" width="5" height="5"/><rect x="80" y="75" width="5" height="5"/><rect x="90" y="80" width="5" height="5"/><rect x="75" y="85" width="5" height="5"/><rect x="85" y="90" width="5" height="5"/></g></svg>');

  const wMatch = content.match(/width:\s*([\d.]+)px/);
  const hMatch = content.match(/height:\s*([\d.]+)px/);
  const certW = wMatch ? parseFloat(wMatch[1]) : 1123;
  const certH = hMatch ? parseFloat(hMatch[1]) : 794;

  const bgUrlMatch = (template.css_content ?? "").match(/background-image:\s*url\(["']?([^"')]+)["']?\)/);
  const bgUrl = bgUrlMatch ? bgUrlMatch[1] : null;
  const cleanCss = (template.css_content ?? "").replace(/\/\* __CERT_BACKGROUND__ \*\/[\s\S]*?\n}\n?/, "");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${certW}px;
      height: ${certH}px;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
      background: none;
    }
    ${cleanCss}
  </style>
</head>
<body>
  <div id="cert-frame" style="width: ${certW}px; height: ${certH}px; overflow: hidden; position: relative;${bgUrl ? ` background: url("${bgUrl}") center / cover no-repeat;` : ""}">
    ${content}
  </div>
</body>
</html>`;
}
