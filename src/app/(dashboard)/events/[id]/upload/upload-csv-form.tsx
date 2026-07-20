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
import { InfoIcon, DownloadIcon, UploadIcon, XIcon, AlertTriangleIcon, FileIcon } from "lucide-react";

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
  const [results, setResults] = useState<SubmitResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const csvRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);

  useEffect(() => {
    let active = true;
    getEventAction(eventId).then((e) => {
      if (!active || !e) return;
      setEvent(e);
      if (e.status === "archive") {
        setError("This event is archived. CSV uploads are no longer available.");
      }
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
    };
    reader.readAsText(file);
  }, []);

  const handleRowFileUpload = useCallback((rowIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1] ?? "";
      const uploaded: UploadedFile = { name: file.name, data: base64, type: file.type };
      setUploadedFiles((prev) => new Map(prev).set(file.name, uploaded));
      setRows((prev) =>
        prev.map((r, i) =>
          i !== rowIndex
            ? r
            : { ...r, file_path: file.name, mode: "file" as const }
        )
      );
    };
    reader.readAsDataURL(file);
  }, []);

  const removeRowFile = useCallback((rowIndex: number) => {
    setRows((prev) => {
      const row = prev[rowIndex];
      if (!row) return prev;
      setUploadedFiles((m) => {
        const next = new Map(m);
        next.delete(row.file_path);
        return next;
      });
      return prev.map((r, i) =>
        i === rowIndex ? { ...r, mode: "template" as const } : r
      );
    });
  }, []);

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
    setPage((p) => Math.min(p, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 2)));
  }

  function setAllMode(mode: "template" | "file") {
    setRows((prev) =>
      prev.map((r) => {
        if (mode === "file" && (!r.file_path || !uploadedFiles.has(r.file_path))) return r;
        return { ...r, mode };
      })
    );
  }

  async function handleSubmit() {
    if (rows.length === 0 || !event) return;
    if (missingFileCount > 0) {
      setError(`${missingFileCount} row(s) have a file path but no uploaded file. Upload the matching files or remove those rows.`);
      return;
    }
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

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;
  const canFileMode = (r: CsvRow) => !!r.file_path && uploadedFiles.has(r.file_path);
  const missingFileCount = rows.filter((r) => r.file_path && !uploadedFiles.has(r.file_path)).length;
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (!event) return <SkeletonDetail />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Upload CSV
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Bulk add participants for: {event.name}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
        <div className="space-y-1.5 text-[var(--color-info-text)]">
          <p className="font-medium">How it works</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Upload a <strong>CSV</strong> with columns{" "}
              <code className="rounded bg-black/5 px-1 py-0.5 text-xs">name, email</code>{" "}
              (and optional <code className="rounded bg-black/5 px-1 py-0.5 text-xs">file_path</code>).
            </li>
            <li>
              Preview the rows. For rows with a <code className="rounded bg-black/5 px-1 py-0.5 text-xs">file_path</code>,
              upload the matching file inline. Rows without a file are
              system-generated from the event template.
            </li>
            <li>
              Click <strong>Add Participants</strong> to import them into this event.
            </li>
          </ol>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
          <p className="text-[var(--color-danger-text)]">{error}</p>
        </div>
      )}

      {step === "upload" && (
        <div className="app-card space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-sm font-semibold text-[var(--color-text)]">
                CSV File
              </label>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    "sample-attendees.csv",
                    ["name", "email", "file_path"],
                    [
                      ["Juan Dela Cruz", "juan@example.com", ""],
                      ["Maria Santos", "maria@example.com", "maria-cert.pdf"],
                    ]
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] transition-colors hover:bg-[var(--color-brand-100)] active:scale-[0.97] cursor-pointer"
              >
                <DownloadIcon className="size-3.5" />
                Download sample
              </button>
            </div>
            <p className="mb-2 text-xs text-tertiary">
              Columns: <code className="rounded bg-black/5 px-1 py-0.5">name, email</code>{" "}
              (with optional <code className="rounded bg-black/5 px-1 py-0.5">file_path</code>)
            </p>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvChange}
              disabled={event?.status === "archive"}
              className="input disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href={`/events/${eventId}`}
              className="btn-cancel"
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-tertiary">
              {rows.length} participant(s) — Page {page + 1} of {totalPages || 1}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAllMode("template")} className="btn">
                All → Template
              </button>
              <button onClick={() => setAllMode("file")} className="btn">
                All → File
              </button>
            </div>
          </div>

          {missingFileCount > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
              <p className="text-[var(--color-warning-text)]">
                {missingFileCount} row(s) have a file path but no uploaded file. Upload the matching files or remove those rows before submitting.
              </p>
            </div>
          )}

          <div className="app-card divide-y divide-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="w-8 py-3 pl-4 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">#</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Email</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">File Path</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">File</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Mode</th>
                  <th className="py-3 pr-4 text-right text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row, i) => {
                  const globalIdx = page * PAGE_SIZE + i;
                  const hasFile = canFileMode(row);
                  const uploadedFile = row.file_path ? uploadedFiles.get(row.file_path) : undefined;
                  const fileInputId = `file-upload-${globalIdx}`;
                  return (
                    <tr key={globalIdx} className="border-b border-[var(--color-border)] last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)]">
                      <td className="py-3 pl-4 text-tertiary text-xs">{globalIdx + 1}</td>
                      <td className="font-medium text-[var(--color-text)]">{row.name}</td>
                      <td className="text-tertiary">{row.email}</td>
                      <td className="text-xs">
                        {row.file_path ? (
                          <span className="text-[var(--color-text)]">{row.file_path}</span>
                        ) : (
                          <span className="text-tertiary">—</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {row.file_path ? (
                          hasFile && uploadedFile ? (
                            <div className="flex items-center gap-2">
                              {uploadedFile.type.startsWith("image/") ? (
                                <img
                                  src={`data:${uploadedFile.type};base64,${uploadedFile.data}`}
                                  alt={uploadedFile.name}
                                  className="size-8 rounded border border-[var(--color-border)] object-cover"
                                />
                              ) : (
                                <FileIcon className="size-8 p-1.5 text-[var(--color-brand-600)] bg-[var(--color-brand-50)] rounded border border-[var(--color-border)]" />
                              )}
                              <span className="truncate max-w-[120px] text-[var(--color-success-text)]">{uploadedFile.name}</span>
                            </div>
                          ) : (
                            <label
                              htmlFor={fileInputId}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-brand-600)] cursor-pointer transition-colors hover:bg-[var(--color-brand-50)]"
                            >
                              <UploadIcon className="size-3" />
                              Upload
                            </label>
                          )
                        ) : (
                          <span className="text-tertiary">—</span>
                        )}
                        {row.file_path && (
                          <input
                            id={fileInputId}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleRowFileUpload(globalIdx, file);
                              e.target.value = "";
                            }}
                          />
                        )}
                      </td>
                      <td>
                        {row.file_path ? (
                          hasFile ? (
                            <span className="inline-flex items-center rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-success-text)]">
                              Uploaded
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-warning-text)]"
                              title={
                                isLocalhost
                                  ? `No file uploaded for "${row.file_path}"`
                                  : undefined
                              }
                            >
                              <AlertTriangleIcon className="size-3" />
                              Not uploadable
                              {isLocalhost && (
                                <span className="ml-1 font-normal opacity-80">
                                  missing {row.file_path}
                                </span>
                              )}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-text-muted)]">
                            System-generated
                          </span>
                        )}
                      </td>
                      <td>
                        <select
                          value={row.mode}
                          onChange={() => toggleRowMode(globalIdx)}
                          disabled={!hasFile}
                          className="input px-2 py-1 text-xs disabled:opacity-50"
                        >
                          <option value="template">Template</option>
                          <option value="file" disabled={!hasFile}>File</option>
                        </select>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {row.file_path && hasFile && (
                            <button
                              onClick={() => removeRowFile(globalIdx)}
                              className="btn btn-ghost p-1"
                              title="Remove uploaded file"
                            >
                              <XIcon className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeRow(globalIdx)}
                            className="btn btn-danger"
                          >
                            Remove
                          </button>
                        </div>
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
                className="btn disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`btn ${i === page ? "bg-[var(--color-brand-600)] text-white border-[var(--color-brand-700)]" : ""}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep("upload")}
              className="btn-cancel"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || rows.length === 0 || missingFileCount > 0}
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
            <span className="font-medium text-[var(--color-success-text)]">{successCount} added</span>
            {failCount > 0 && (
              <span className="font-medium text-[var(--color-danger-text)]">{failCount} failed</span>
            )}
          </div>

          {removedRows.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
              <p className="text-[var(--color-info-text)]">
                {removedRows.length} removed row(s) have been downloaded as CSV.
              </p>
            </div>
          )}

          <div className="app-card divide-y divide-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-3 pl-4 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Email</th>
                  <th className="py-3 pr-4 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)]">
                    <td className="py-3 pl-4 font-medium text-[var(--color-text)]">{r.name}</td>
                    <td className="py-3 text-tertiary">{r.email}</td>
                    <td className="py-3 pr-4">
                      {r.success ? (
                        <span className="status-badge status-badge--active">Added</span>
                      ) : (
                        <span className="status-badge status-badge--danger">{r.error ?? "Failed"}</span>
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
              className="btn-cancel"
            >
              Back to Event
            </Link>
            <button
              onClick={() => {
                setStep("upload");
                setRows([]);
                setRemovedRows([]);
                setResults(null);
                setPage(0);
                if (csvRef.current) csvRef.current.value = "";
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
