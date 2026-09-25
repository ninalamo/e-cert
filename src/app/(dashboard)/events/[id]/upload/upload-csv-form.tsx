"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import { attendeesApi } from "@/lib/api/attendees";
import type { Event } from "@/types/event";
import type { AttendeeMetadata } from "@/types/event-attendee";
import { usePagination, Paginator } from "@/components/ui/paginator";
import { SkeletonUpload } from "@/components/ui/skeleton";
import { InfoIcon, DownloadIcon, UploadIcon, XIcon, AlertTriangleIcon, Loader2Icon } from "lucide-react";

const MAX_FILE_MB = 10;
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

interface CsvRow {
  name: string;
  email: string;
  file_path: string;
  mode: "template" | "file";
  _originalIndex: number;
  _emailError?: string;
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  if (!EMAIL_RE.test(email)) return "Invalid email format";
  return null;
}

export default function UploadCsvForm({
  eventId,
  isAdmin = false,
  initialEvent = null,
}: {
  eventId: string;
  isAdmin?: boolean;
  initialEvent?: Event | null;
}) {
  const event = initialEvent;

  const [step, setStep] = useState<"upload" | "preview" | "submitting" | "results">("upload");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [removedRows, setRemovedRows] = useState<CsvRow[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedFile>>(new Map());
  const [results, setResults] = useState<SubmitResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [error, setError] = useState<string | null>(
    initialEvent?.status === "archive" ? "This event is archived. CSV uploads are no longer available." : null
  );

  const csvRef = useRef<HTMLInputElement>(null);

  const {
    page,
    totalPages,
    pageSize,
    paginatedItems: pageRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 25);

  const resultsPagination = usePagination(results ?? [], 25);

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

      const splitRow = (line: string): string[] => {
        if (line.includes("|")) {
          return line.split("|").map((c) => c.trim());
        }
        if (line.includes('"')) {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let ci = 0; ci < line.length; ci++) {
            const ch = line[ci];
            if (ch === '"') {
              if (inQuotes && ci + 1 < line.length && line[ci + 1] === '"') {
                current += '"';
                ci++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === "," && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += ch;
            }
          }
          result.push(current.trim());
          return result;
        }
        return line.split(",").map((c) => c.trim());
      };

      const header = splitRow(lines[0].toLowerCase());
      const nameIdx = header.indexOf("name");
      const emailIdx = header.indexOf("email");

      if (nameIdx === -1 || emailIdx === -1) {
        setError("CSV must have 'name' and 'email' columns");
        return;
      }

      const parsed: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = splitRow(lines[i]);
        const name = cols[nameIdx] ?? "";
        const email = cols[emailIdx] ?? "";
        if (name && email) {
          parsed.push({
            name,
            email,
            file_path: "",
            mode: "template",
            _originalIndex: i - 1,
            _emailError: validateEmail(email) ?? undefined,
          });
        }
      }

      if (parsed.length === 0) {
        setError("No valid rows found in CSV");
        return;
      }

      parsed.sort((a, b) => {
        if (a._emailError && !b._emailError) return -1;
        if (!a._emailError && b._emailError) return 1;
        return 0;
      });

      setRows(parsed);
      setPage(0);
      setStep("preview");
    };
    reader.readAsText(file);
  }, [setPage]);

  const handleRowFileUpload = useCallback((rowIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1] ?? "";
      const baseName = file.name.split(/[\\/]/).pop() || file.name;
      const uploaded: UploadedFile = { name: baseName, data: base64, type: file.type };
      setUploadedFiles((prev) => new Map(prev).set(baseName, uploaded));
      setRows((prev) =>
        prev.map((r, i) =>
          i !== rowIndex
            ? r
            : { ...r, file_path: baseName, mode: "file" as const }
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

  function removeRow(globalIndex: number) {
    setRows((prev) => {
      const removed = prev[globalIndex];
      if (removed) setRemovedRows((r) => [...r, removed]);
      return prev.filter((_, i) => i !== globalIndex);
    });
    setPage(0);
  }

  async function handleSubmit() {
    if (rows.length === 0 || !event) return;
    if (missingFileCount > 0) {
      setError(`${missingFileCount} row(s) have a file path but no uploaded file. Upload the matching files or remove those rows.`);
      return;
    }
    if (invalidEmailCount > 0) {
      setError(`${invalidEmailCount} row(s) have invalid email addresses. Fix or remove those rows before submitting.`);
      return;
    }
    setLoading(true);
    setError(null);
    setStep("submitting");
    setSubmitProgress(0);

    const attendees = rows.map((r) => {
      const useFile = !!r.file_path && uploadedFiles.has(r.file_path);
      let metadata: AttendeeMetadata;
      const f = useFile ? uploadedFiles.get(r.file_path) : undefined;
      if (f) {
        metadata = {
          generation_mode: "file",
          file_data: f.data,
          file_name: f.name,
          file_type: f.type,
        };
      } else {
        metadata = { generation_mode: "template" };
      }
      return { name: r.name, email: r.email, metadata };
    });

    const progressTimer = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = prev < 30 ? 8 : prev < 60 ? 4 : prev < 80 ? 2 : 1;
        return Math.min(prev + increment, 90);
      });
    }, 200);

    try {
      const { results } = await attendeesApi.bulkAdd(eventId, {
        organization_id: ORG_ID,
        attendees,
      });

      clearInterval(progressTimer);
      setSubmitProgress(100);

      const submitResults: SubmitResult[] = attendees.map((a) => {
        const item = results?.find((r) => r.email === a.email);
        return {
          name: a.name,
          email: a.email,
          success: !item?.error,
          error: item?.error,
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
    } catch {
      clearInterval(progressTimer);
      setLoading(false);
      setStep("preview");
      setError("Failed to add participants. Please try again.");
    }
  }

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;
  const canFileMode = (r: CsvRow) => !!r.file_path && uploadedFiles.has(r.file_path);

  const validateUploadedFile = (f: UploadedFile): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Unsupported file type";
    }
    const bytes = Math.ceil((f.data.length * 3) / 4);
    if (bytes > MAX_FILE_MB * 1024 * 1024) {
      return `Exceeds ${MAX_FILE_MB} MB limit`;
    }
    return null;
  };

  const rowFileError = (r: CsvRow): string | null => {
    if (!r.file_path) return null;
    const f = uploadedFiles.get(r.file_path);
    if (!f) return "Certificate not attached";
    return validateUploadedFile(f);
  };

  const missingFileCount = rows.filter(
    (r) => r.file_path && rowFileError(r) === "Certificate not attached"
  ).length;

  const invalidEmailCount = rows.filter((r) => !!r._emailError).length;

  if (!event) return <SkeletonUpload />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Bulk Import — Participants
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Bulk add participants for: {event.name}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
        <div className="space-y-1.5 text-[var(--color-info-text)]">
          <p className="font-medium">How it works</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Upload a file with <strong>name</strong> and <strong>email</strong> columns.
              Supports <strong>comma-separated</strong> or <strong>pipe-separated</strong> (<code className="rounded bg-black/5 px-1 py-0.5 text-xs">|</code>) formats. Quoted names are handled (e.g. <code className="rounded bg-black/5 px-1 py-0.5 text-xs">&quot;Reynaldo, Jr.&quot;,email@domain.com</code>).
            </li>
            <li>Preview the rows and remove any with invalid emails.</li>
            <li>
              Click <strong>Add Participants</strong> to import them into this event.
            </li>
          </ol>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
          <p className="text-[var(--color-danger-text)]">{error}</p>
        </div>
      )}

      {step === "upload" && (
        <div className="app-card space-y-5 p-5">
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
                    ["name", "email"],
                    [
                      ["Juan Dela Cruz", "juan@example.com"],
                      ["Maria Santos", "maria@example.com"],
                    ]
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] transition-colors hover:bg-[var(--color-brand-100)] active:scale-[0.97] cursor-pointer"
              >
                <DownloadIcon className="size-3.5" />
                Download sample
              </button>
            </div>
            <p className="mb-3 text-xs text-tertiary">
              Comma or pipe separated: <code className="rounded bg-black/5 px-1 py-0.5">name, email</code> / <code className="rounded bg-black/5 px-1 py-0.5">name | email</code>
            </p>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)] px-4 py-10 text-center transition-colors hover:border-[var(--color-brand-500)] hover:bg-[var(--color-brand-50)] ${
                event?.status === "archive" ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <UploadIcon className="size-7 text-[var(--color-brand-600)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                Tap to choose a file
              </span>
              <span className="text-xs text-tertiary">.csv or .txt</span>
              <input
                ref={csvRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvChange}
                disabled={event?.status === "archive"}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
              <Link
                href={`/events/${eventId}?tab=attendees`}
                className="btn-cancel"
              >
                Back to Event
              </Link>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-tertiary">
              {rows.length} participant(s) — Page {page + 1} of {totalPages || 1}
              {invalidEmailCount > 0 && (
                <span className="ml-2 text-[var(--color-danger-text)] font-medium">
                  ({invalidEmailCount} shown first — invalid email)
                </span>
              )}
            </p>
          </div>

          {missingFileCount > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
              <p className="text-[var(--color-warning-text)]">
                {missingFileCount} attached certificate(s) are invalid. Attach a valid file (PDF/PNG/JPG, up to {MAX_FILE_MB} MB) or remove those rows before submitting.
              </p>
            </div>
          )}

          {invalidEmailCount > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
              <p className="text-[var(--color-danger-text)]">
                {invalidEmailCount} row(s) have invalid email addresses. Fix or remove those rows before submitting.
              </p>
            </div>
          )}

          <div className="app-card divide-y divide-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="w-8 py-3 pl-4 text-center text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">#</th>
                    <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Participant</th>
                    <th className="py-3 text-center text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                    <th className="py-3 pr-4 text-center text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => {
                    const globalIdx = page * pageSize + i;
                    const hasFile = canFileMode(row);
                    const uploadedFile = row.file_path ? uploadedFiles.get(row.file_path) : undefined;
                    const fileInputId = `file-upload-${globalIdx}`;
                    return (
                      <tr key={globalIdx} className="border-b border-[var(--color-border)] last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)]">
                        <td className="py-3 pl-4 text-center text-tertiary text-xs">{globalIdx + 1}</td>
                        <td className="text-left font-medium text-[var(--color-text)]">
                          {row.name} <span className="font-normal text-tertiary">({row.email})</span>
                        </td>
                        <td className="text-center">
                          {(() => {
                            if (row._emailError) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-danger-text)]"
                                  title={row._emailError}
                                >
                                  <AlertTriangleIcon className="size-3" />
                                  {row._emailError}
                                </span>
                              );
                            }
                            if (!row.file_path) {
                              return (
                                <span className="inline-flex items-center rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-text-muted)]">
                                  Ready — generated from template
                                </span>
                              );
                            }
                            const err = rowFileError(row);
                            if (!err) {
                              return (
                                <span className="inline-flex items-center rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-success-text)]">
                                  Ready — with attached file
                                </span>
                              );
                            }
                            if (err === "Certificate not attached") {
                              return (
                                <span className="inline-flex items-center rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-text-muted)]">
                                  Certificate not attached
                                </span>
                              );
                            }
                            return (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-warning-text)]"
                                title={err}
                              >
                                <AlertTriangleIcon className="size-3" />
                                {err}
                              </span>
                            );
                          })()}
                        </td>
                         <td className="text-center">
                           <div className="flex items-center justify-center gap-2">
                            {hasFile ? (
                              <>
                                <span className="hidden sm:inline truncate max-w-[120px] text-[var(--color-success-text)] text-xs mr-1">
                                  {uploadedFile?.name}
                                </span>
                                 <button
                                   onClick={() => removeRowFile(globalIdx)}
                                   className="btn-danger-text inline-flex items-center gap-1 px-2 py-1 text-xs"
                                   title="Clear attached certificate"
                                 >
                                   <XIcon className="size-3.5" />
                                   Clear
                                 </button>
                              </>
                            ) : (
                               <label
                                 htmlFor={fileInputId}
                                 className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-100)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] cursor-pointer transition-colors hover:bg-[var(--color-brand-200)] active:scale-[0.97]"
                               >
                                <UploadIcon className="size-3" />
                                Attach Certificate
                              </label>
                            )}
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
                             <button
                               onClick={() => removeRow(globalIdx)}
                               className="btn-danger-text"
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
          </div>

          {totalPages > 1 && (
            <Paginator
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={rows.length}
              setPage={setPage}
              setPageSize={setPageSize}
            />
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep("upload")}
              className="btn-cancel"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                setRows([]);
                setPage(0);
                setStep("upload");
                if (csvRef.current) csvRef.current.value = "";
              }}
              className="btn"
            >
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || rows.length === 0 || missingFileCount > 0 || invalidEmailCount > 0}
              className="btn disabled:opacity-50"
            >
              {loading ? "Adding..." : `Add ${rows.length} Participant(s)`}
            </button>
          </div>
        </div>
      )}

      {step === "submitting" && (
        <div className="app-card flex flex-col items-center gap-4 p-8">
          <Loader2Icon className="size-10 animate-spin text-[var(--color-brand-600)]" />
          <div className="text-center w-full max-w-md">
            <p className="text-lg font-semibold text-[var(--color-text)]">Adding participants...</p>
            <p className="text-sm text-tertiary mt-1">Please do not close or navigate away.</p>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-brand-600)] transition-all duration-300"
                  style={{ width: `${submitProgress}%` }}
                />
              </div>
              <p className="text-xs text-tertiary">
                {submitProgress < 100
                  ? `Processing ${rows.length} participant(s)... ${submitProgress}%`
                  : "Done!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && results && (
        <div className="space-y-4">
          {failCount === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-success-text)]" />
              <p className="font-medium text-[var(--color-success-text)]">
                Upload complete — {successCount} participant(s) added successfully.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
              <p className="font-medium text-[var(--color-danger-text)]">
                Upload finished with {successCount} added and {failCount} failed.
                {isAdmin ? " See details below." : " Contact an administrator if you need the error details."}
              </p>
            </div>
          )}

          {removedRows.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
              <p className="text-[var(--color-info-text)]">
                {removedRows.length} removed row(s) have been downloaded as CSV.
              </p>
            </div>
          )}

          <div className="app-card divide-y divide-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="w-8 py-3 pl-4 text-center text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">#</th>
                    <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Participant</th>
                    <th className="py-3 text-center text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsPagination.paginatedItems.map((r, i) => (
                    <tr key={resultsPagination.page * resultsPagination.pageSize + i} className="border-b border-[var(--color-border)] last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)]">
                      <td className="py-3 pl-4 text-center text-tertiary text-xs">{resultsPagination.page * resultsPagination.pageSize + i + 1}</td>
                      <td className="text-left font-medium text-[var(--color-text)]">
                        {r.name} <span className="font-normal text-tertiary">({r.email})</span>
                      </td>
                      <td className="py-3 text-center">
                        {r.success ? (
                          <span className="status-badge status-badge--active">Added</span>
                        ) : (
                          <span className="status-badge status-badge--danger">
                            {isAdmin ? (r.error ?? "Failed") : "Failed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {resultsPagination.totalPages > 1 && (
            <Paginator
              page={resultsPagination.page}
              totalPages={resultsPagination.totalPages}
              pageSize={resultsPagination.pageSize}
              totalItems={(results ?? []).length}
              setPage={resultsPagination.setPage}
              setPageSize={resultsPagination.setPageSize}
            />
          )}

          <div className="flex justify-end gap-2">
            <Link
              href={`/events/${eventId}?tab=attendees`}
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
              className="btn"
            >
              Upload More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
