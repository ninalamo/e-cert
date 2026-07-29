"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paginator } from "@/components/ui/paginator";
import type { AuditLog } from "@/types/audit-log";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Login",
  "auth.logout": "Logout",
  "auth.registered": "Registered",
  "auth.email_confirmed": "Email Confirmed",
  "auth.password_reset_requested": "Password Reset Requested",
  "auth.password_reset": "Password Reset",
  "auth.password_changed": "Password Changed",
  "auth.email_updated": "Email Updated",
  "certificate.issued": "Certificate Issued",
  "certificate.revoked": "Certificate Revoked",
  "certificate.deleted": "Certificate Deleted",
  "certificate.viewed": "Certificate Viewed",
  "email.sent": "Email Sent",
  "email.failed": "Email Failed",
  "event.created": "Event Created",
  "event.deleted": "Event Deleted",
  "member.added": "Member Added",
  "member.removed": "Member Removed",
  "member.role_changed": "Role Changed",
  "sql.error": "SQL Error",
  "workflow.error": "Workflow Error",
};

const SOURCE_LABELS: Record<string, string> = {
  ui: "UI",
  api: "API",
  workflow: "Workflow",
  system: "System",
};

function ActionBadge({ action }: { action: string }) {
  const isError = action.includes("failed") || action.includes("error");
  const isWarn = action.includes("revoked") || action.includes("deleted");
  const bg = isError
    ? "bg-red-100 text-red-800"
    : isWarn
    ? "bg-amber-100 text-amber-800"
    : "bg-green-100 text-green-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg}`}>
      {ACTION_LABELS[action] ?? action}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    ui: "bg-blue-100 text-blue-800",
    api: "bg-purple-100 text-purple-800",
    workflow: "bg-indigo-100 text-indigo-800",
    system: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[source] ?? "bg-gray-100 text-gray-800"}`}>
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

const ACTIONS_FILTER = [
  "", "auth.login", "auth.logout", "auth.registered", "auth.email_confirmed",
  "auth.password_reset_requested", "auth.password_reset", "auth.password_changed",
  "certificate.issued", "certificate.revoked", "certificate.deleted", "certificate.viewed",
  "email.sent", "email.failed", "event.created", "event.deleted",
  "workflow.error",
];

const SOURCES_FILTER = ["", "ui", "api", "workflow", "system"];

interface AuditLogTableProps {
  initialData: { data: AuditLog[]; total: number };
}

export default function AuditLogTable({ initialData }: AuditLogTableProps) {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState({
    action: "",
    source: "" as string,
    fromDate: "",
    toDate: "",
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [serverData, setServerData] = useState(initialData);

  const fetchPage = useCallback(async (p: number, ps: number, f: typeof filters) => {
    const { getAuditLogsAction } = await import("../server/audit.actions");
    const result = await getAuditLogsAction({
      action: f.action || undefined,
      source: f.source || undefined,
      fromDate: f.fromDate || undefined,
      toDate: f.toDate || undefined,
      limit: ps,
      offset: p * ps,
    });
    startTransition(() => {
      setServerData(result);
    });
  }, []);

  const applyFilters = useCallback(() => {
    setPage(0);
    startTransition(async () => {
      await fetchPage(0, pageSize, filters);
    });
  }, [fetchPage, pageSize, filters]);

  useEffect(() => {
    fetchPage(page, pageSize, filters);
  }, [page, pageSize, fetchPage, filters]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchPage(page, pageSize, filters);
    }, 20000);
    return () => clearInterval(intervalId);
  }, [page, pageSize, filters, fetchPage]);

  const totalPages = Math.max(1, Math.ceil(serverData.total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Action</label>
          <select
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            className="block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          >
            {ACTIONS_FILTER.map((a) => (
              <option key={a} value={a}>{a || "All actions"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Source</label>
          <select
            value={filters.source}
            onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
            className="block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          >
            {SOURCES_FILTER.map((s) => (
              <option key={s} value={s}>{s || "All sources"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            className="w-40"
          />
        </div>
        <Button onClick={applyFilters} disabled={isPending} size="sm">
          Filter
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serverData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No audit log entries found.
                </TableCell>
              </TableRow>
            ) : (
              serverData.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{entry.user_email ?? entry.user_id ?? "—"}</TableCell>
                  <TableCell><ActionBadge action={entry.action} /></TableCell>
                  <TableCell><SourceBadge source={entry.source} /></TableCell>
                  <TableCell className="text-sm font-mono text-xs">
                    {entry.entity_type ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {entry.details && Object.keys(entry.details).length > 0 ? (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-muted-foreground hover:text-foreground">View</summary>
                        <pre className="mt-1 text-xs bg-muted rounded p-2 overflow-x-auto max-h-32">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </details>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Paginator
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={serverData.total}
        setPage={setPage}
        setPageSize={(s) => { setPageSize(s); setPage(0); }}
      />
    </div>
  );
}
