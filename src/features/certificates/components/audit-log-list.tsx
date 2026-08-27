"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { certificatesApi } from "@/lib/api/certificates";
import type { CertificateEmailLog } from "@/types/certificate-email";
import { usePagination } from "@/components/ui/paginator";
import { SearchIcon, RefreshCwIcon } from "lucide-react";

interface AuditLogListProps {
  initialLogs: CertificateEmailLog[];
}

export default function AuditLogList({ initialLogs }: AuditLogListProps) {
  const [logs, setLogs] = useState<CertificateEmailLog[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    const result = await certificatesApi.getAllEmailLogs(200);
    setLogs(result.data ?? []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !search ||
        log.sent_to.toLowerCase().includes(search.toLowerCase()) ||
        log.subject.toLowerCase().includes(search.toLowerCase()) ||
        log.certificate_id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } =
    usePagination(filtered, 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tertiary" />
          <input
            type="text"
            placeholder="Search by email, subject, or certificate ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-96 rounded-md border pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="input text-sm w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No audit log entries found.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="tbl-container">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Sent To</th>
                <th className="text-left">Subject</th>
                <th className="text-left">Certificate</th>
                <th className="text-left">Status</th>
                <th className="text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((log) => (
                <tr key={log.id}>
                  <td className="text-tertiary whitespace-nowrap">
                    {new Date(log.sent_at).toLocaleString()}
                  </td>
                  <td>{log.sent_to}</td>
                  <td className="max-w-[200px] truncate">{log.subject}</td>
                  <td className="font-mono text-xs">
                    <Link
                      href={`/certificates/${log.certificate_id}`}
                      className="text-info hover:underline"
                    >
                      {log.certificate_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td>
                    {log.status === "sent" ? (
                      <span className="status-pill status-active">Sent</span>
                    ) : (
                      <span className="status-pill status-revoked">Failed</span>
                    )}
                  </td>
                  <td className="text-xs text-tertiary max-w-[150px] truncate">
                    {log.error_message ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-tertiary">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="input text-xs w-auto py-1"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-xs"
            >
              Prev
            </button>
            <span className="text-xs text-tertiary">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
