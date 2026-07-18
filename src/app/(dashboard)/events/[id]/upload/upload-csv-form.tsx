"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import { getEventAction } from "@/features/events/server/event.actions";
import { getTemplatesAction } from "@/features/templates/server/template.actions";
import { bulkAddAttendeesAction } from "@/features/events/server/attendee.actions";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import type { AttendeeMetadata } from "@/types/event-attendee";
import { SkeletonDetail } from "@/components/ui/skeleton";

const PAGE_SIZE = 25;

interface CsvRow {
  name: string;
  email: string;
  file_path: string;
  mode: "template" | "file";
  _originalIndex: number;
}

interface UploadedFile {
  name: string;
  data: string;
  type: string;
}

interface SubmitResult {
  name: string;
  email: string;
  success: boolean;
  error?: string;
}

function renderTemplateHtml(
  html: string,
  css: string,
  vars: Record<string, string>
): string {
  let rendered = html;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${rendered}</body></html>`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UploadCsvForm({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);

  const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [removedRows, setRemovedRows] = useState<CsvRow[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedFile>>(new Map());
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<SubmitResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const csvRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    let active = true;
    getEventAction(eventId).then((e) => {
      if (!active || !e) return;
      setEvent(e);
      if (e.template_id) {
        getTemplatesAction(e.organization_id).then((ts) => {
          if (!active) return;
          setTemplate(ts.find((t) => t.id === e.template_id) ?? null);
        });
      }
    });
    return () => { active = false; };
  }, [eventId]);

  const handleCsvChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setError("CSV must have a header row and at least one data row");
        return;
      }

      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const nameIdx = header.indexOf("name");
      const emailIdx = header.indexOf("email");
      const filePathIdx = header.indexOf("file_path");

      if (nameIdx === -1 || emailIdx === -1) {
        setError("CSV must have 'name' and 'email' columns");
        return;
      }

      const parsed: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const name = cols[nameIdx] ?? "";
        const email = cols[emailIdx] ?? "";
        const filePath = filePathIdx !== -1 ? (cols[filePathIdx] ?? "") : "";
        if (name && email) {
          parsed.push({
            name,
            email,
            file_path: filePath,
            mode: filePath ? "file" : "template",
            _originalIndex: i - 1,
          });
        }
      }

      if (parsed.length === 0) {
        setError("No valid rows found in CSV");
        return;
      }

      setRows(parsed);
      setPage(0);
      setSelected(new Set());
    };
    reader.readAsText(file);
  }, []);

  const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const map = new Map(uploadedFiles);
    const processFiles = async () => {
      for (const file of Array.from(files)) {
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(",")[1] ?? "";
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });
        map.set(file.name, { name: file.name, data, type: file.type });
      }
      setUploadedFiles(new Map(map));

      setRows((prev) =>
        prev.map((r) => {
          if (r.file_path && map.has(r.file_path)) {
            return { ...r, mode: "file" as const };
          }
          return r;
        })
      );
    };
    processFiles();
  }, [uploadedFiles]);

  function toggleRowMode(index: number) {
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row.file_path || !uploadedFiles.has(row.file_path)) return prev;
      next[index] = { ...row, mode: row.mode === "template" ? "file" : "template" };
      return next;
    });
  }

  function removeRow(globalIndex: number) {
    setRows((prev) => {
      const removed = prev[globalIndex];
      if (removed) setRemovedRows((r) => [...r, removed]);
      return prev.filter((_, i) => i !== globalIndex);
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(globalIndex);
      return next;
    });
    setPage((p) => Math.min(p, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 2)));
  }

  function removeSelected() {
    const toRemove = Array.from(selected);
    setRows((prev) => {
      const removed = prev.filter((_, i) => selected.has(i));
      setRemovedRows((r) => [...r, ...removed]);
      return prev.filter((_, i) => !selected.has(i));
    });
    setSelected(new Set());
    setPage(0);
  }

  function setAllMode(mode: "template" | "file") {
    setRows((prev) =>
      prev.map((r) => {
        if (mode === "file" && (!r.file_path || !uploadedFiles.has(r.file_path))) return r;
        return { ...r, mode };
      })
    );
  }

  function setSelectedMode(mode: "template" | "file") {
    setRows((prev) =>
      prev.map((r, i) => {
        if (!selected.has(i)) return r;
        if (mode === "file" && (!r.file_path || !uploadedFiles.has(r.file_path))) return r;
        return { ...r, mode };
      })
    );
  }

  function toggleSelectAll() {
    const pageIndices = pageRows.map((_, i) => page * PAGE_SIZE + i);
    const allSelected = pageIndices.every((i) => selected.has(i));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIndices.forEach((i) => next.delete(i));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIndices.forEach((i) => next.add(i));
        return next;
      });
    }
  }

  async function handleSubmit() {
    if (rows.length === 0 || !event) return;
    setLoading(true);
    setError(null);

    const attendees = rows.map((r) => {
      let metadata: AttendeeMetadata | undefined;
      if (r.mode === "file" && r.file_path) {
        const f = uploadedFiles.get(r.file_path);
        if (f) {
          metadata = {
            generation_mode: "file",
            file_data: f.data,
            file_name: f.name,
            file_type: f.type,
          };
        }
      } else if (template) {
        const html = renderTemplateHtml(template.html_content, template.css_content ?? "", {
          recipient_name: r.name,
          certificate_number: "",
          issued_date: new Date().toLocaleDateString(),
          organization_name: "Organization",
          qr_code: "",
        });
        metadata = { generation_mode: "template", html };
      }
      return { name: r.name, email: r.email, metadata };
    });

    const result = await bulkAddAttendeesAction({
      event_id: eventId,
      organization_id: ORG_ID,
      attendees,
    });

    const submitResults: SubmitResult[] = attendees.map((a) => {
      const err = result.errors.find((e) => e.email === a.email);
      return {
        name: a.name,
        email: a.email,
        success: !err,
        error: err?.error,
      };
    });

    setResults(submitResults);
    setLoading(false);
    setStep("results");

    if (removedRows.length > 0) {
      downloadCsv(
        `removed-rows-${event.name.replace(/\s+/g, "-")}.csv`,
        ["name", "email", "file_path"],
        removedRows.map((r) => [r.name, r.email, r.file_path])
      );
    }
  }

  if (!event) return <SkeletonDetail />;

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;
  const canFileMode = (r: CsvRow) => !!r.file_path && uploadedFiles.has(r.file_path);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload CSV</h1>
        <p className="text-muted-foreground text-sm">
          Bulk add participants for: {event.name}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {step === "upload" && (
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium">
              CSV File (columns: name, email, file_path optional)
            </label>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvChange}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Participant Files (PDF, PNG, JPG) — optional
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              multiple
              onChange={handleFilesChange}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
            {uploadedFiles.size > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {uploadedFiles.size} file(s) uploaded
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href={`/events/${eventId}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back to Event
            </Link>
            <button
              onClick={() => {
                if (rows.length === 0) {
                  setError("Please upload a CSV first");
                  return;
                }
                setPage(0);
                setSelected(new Set());
                setStep("preview");
              }}
              disabled={rows.length === 0}
              className="btn-brand disabled:opacity-50"
            >
              Preview {rows.length} Row(s)
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rows.length} participant(s) — Page {page + 1} of {totalPages || 1}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setAllMode("template")} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                All → Template
              </button>
              <button onClick={() => setAllMode("file")} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                All → File
              </button>
              {selected.size > 0 && (
                <>
                  <button onClick={() => setSelectedMode("template")} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                    Selected → Template
                  </button>
                  <button onClick={() => setSelectedMode("file")} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                    Selected → File
                  </button>
                  <button onClick={removeSelected} className="text-xs border rounded px-2 py-1 text-red-600 hover:bg-red-50">
                    Remove Selected ({selected.size})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="tbl-container">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={pageRows.length > 0 && pageRows.every((_, i) => selected.has(page * PAGE_SIZE + i))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left w-8">#</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">File Path</th>
                  <th className="text-left">Mode</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => {
                  const globalIdx = page * PAGE_SIZE + i;
                  const hasFile = canFileMode(row);
                  return (
                    <tr key={globalIdx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(globalIdx)}
                          onChange={() => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(globalIdx)) next.delete(globalIdx);
                              else next.add(globalIdx);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="text-tertiary text-xs">{globalIdx + 1}</td>
                      <td className="font-medium">{row.name}</td>
                      <td className="text-tertiary">{row.email}</td>
                      <td className="text-xs">
                        {row.file_path ? (
                          hasFile ? (
                            <span className="text-green-600">{row.file_path}</span>
                          ) : (
                            <span className="text-amber-600" title="File not uploaded">{row.file_path} ⚠</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td>
                        <select
                          value={row.mode}
                          onChange={() => toggleRowMode(globalIdx)}
                          disabled={!hasFile && row.mode === "template"}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value="template">Template</option>
                          <option value="file" disabled={!hasFile}>File</option>
                        </select>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => removeRow(globalIdx)}
                          className="text-xs text-danger hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded border px-3 py-1 text-sm ${i === page ? "bg-brand-600 text-white" : "hover:bg-gray-50"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep("upload")}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || rows.length === 0}
              className="btn-brand disabled:opacity-50"
            >
              {loading ? "Adding..." : `Add ${rows.length} Participant(s)`}
            </button>
          </div>
        </div>
      )}

      {step === "results" && results && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 font-medium">{successCount} added</span>
            {failCount > 0 && (
              <span className="text-red-600 font-medium">{failCount} failed</span>
            )}
          </div>

          {removedRows.length > 0 && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-600">
              {removedRows.length} removed row(s) have been downloaded as CSV.
            </div>
          )}

          <div className="tbl-container">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td className="text-tertiary">{r.email}</td>
                    <td>
                      {r.success ? (
                        <span className="status-pill status-active">Added</span>
                      ) : (
                        <span className="status-pill status-revoked">{r.error ?? "Failed"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href={`/events/${eventId}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back to Event
            </Link>
            <button
              onClick={() => {
                setStep("upload");
                setRows([]);
                setRemovedRows([]);
                setResults(null);
                setSelected(new Set());
                setPage(0);
                if (csvRef.current) csvRef.current.value = "";
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="btn-brand"
            >
              Upload More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
