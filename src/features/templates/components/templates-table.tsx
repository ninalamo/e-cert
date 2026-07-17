"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  getTemplatesAction,
  deleteTemplateAction,
} from "@/features/templates/server/template.actions";
import type { CertificateTemplate } from "@/types/template";
import { ORG_ID } from "@/lib/org";
import { usePagination, Paginator } from "@/components/ui/paginator";

type FilterKey = "all" | "with-description" | "without-description";
type SortKey = "name-asc" | "name-desc" | "created-desc" | "created-asc";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "with-description", label: "With description" },
  { key: "without-description", label: "No description" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "created-desc", label: "Newest" },
  { key: "created-asc", label: "Oldest" },
  { key: "name-asc", label: "Name A–Z" },
  { key: "name-desc", label: "Name Z–A" },
];

export default function TemplatesTable() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("created-desc");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const data = await getTemplatesAction(ORG_ID);
    setTemplates(data);
    setLoaded(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    const result = await deleteTemplateAction(id);
    if (result?.error) {
      alert(result.error);
    } else {
      loadTemplates();
      setPage(0);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search templates..."
            className="input w-full pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterKey);
              setPage(0);
            }}
            className="input text-sm w-auto"
          >
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setPage(0);
            }}
            className="input text-sm w-auto"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Link href="/dashboard/templates/new" className="btn-brand whitespace-nowrap">
            New Template
          </Link>
        </div>
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm">Loading templates...</p>
      )}

      {!loading && loaded && filtered.length === 0 && (
        <div className="tbl-container">
          <div className="p-8 text-center text-tertiary">
            {templates.length === 0
              ? "No templates yet. Create your first one."
              : "No templates match your search."}
          </div>
        </div>
      )}

      {!loading && loaded && filtered.length > 0 && (
        <div className="tbl-container">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Description</th>
                <th className="text-left">Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">
                    <Link
                      href={`/dashboard/templates/${t.id}`}
                      className="hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="text-tertiary">{t.description || "—"}</td>
                  <td className="text-tertiary">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Link
                      href={`/dashboard/templates/${t.id}`}
                      className="text-xs text-info hover:underline mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        </div>
      )}
    </div>
  );
}
