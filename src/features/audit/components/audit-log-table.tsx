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
import { Checkbox } from "@/components/ui/checkbox";
import { Paginator } from "@/components/ui/paginator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Trash2Icon,
  FileDownIcon,
  Loader2Icon,
} from "lucide-react";
import { auditApi } from "@/lib/api/audit";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | "all">("selected");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchPage = useCallback(async (p: number, ps: number, f: typeof filters) => {
    const result = await auditApi.list({
      action: f.action || undefined,
      source: f.source || undefined,
      from_date: f.fromDate || undefined,
      to_date: f.toDate || undefined,
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

  function buildAuditCsv(logs: AuditLog[]): string {
    const headers = ["ID", "Time", "User", "Action", "Source", "Entity Type", "Entity ID", "Details", "IP Address", "User Agent"];
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const rows = logs.map((l) =>
      [
        l.id,
        l.created_at,
        l.user_email ?? l.user_id ?? "",
        l.action,
        l.source,
        l.entity_type ?? "",
        l.entity_id ?? "",
        l.details ? JSON.stringify(l.details) : "",
        l.ip_address ?? "",
        l.user_agent ?? "",
      ].map(escapeCsv).join(",")
    );
    return headers.map(escapeCsv).join(",") + "\n" + rows.join("\n");
  }

  function triggerDownload(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownload() {
    setExportLoading(true);
    try {
      if (selectedIds.length > 0) {
        const result = await auditApi.getByIds(selectedIds);
        triggerDownload(buildAuditCsv(result.data ?? []), `audit-logs-selected-${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        const result = await auditApi.getForExport({
          action: filters.action || undefined,
          source: filters.source || undefined,
          from_date: filters.fromDate || undefined,
          to_date: filters.toDate || undefined,
        });
        triggerDownload(buildAuditCsv(result.data ?? []), `audit-logs-all-${new Date().toISOString().slice(0, 10)}.csv`);
      }
      toast.success("CSV downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      let deleted: AuditLog[] = [];
      if (deleteTarget === "selected") {
        const res = await auditApi.deleteByIds(selectedIds);
        deleted = res.data ?? [];
      } else {
        const res = await auditApi.deleteAll({
          action: filters.action || undefined,
          source: filters.source || undefined,
          from_date: filters.fromDate || undefined,
          to_date: filters.toDate || undefined,
        });
        deleted = res.data ?? [];
      }
      triggerDownload(buildAuditCsv(deleted), `audit-logs-deleted-${new Date().toISOString().slice(0, 10)}.csv`);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      setPage(0);
      const result = await auditApi.list({
        action: filters.action || undefined,
        source: filters.source || undefined,
        from_date: filters.fromDate || undefined,
        to_date: filters.toDate || undefined,
        limit: pageSize,
        offset: 0,
      });
      startTransition(() => {
        setServerData(result);
      });
      toast.success(`Deleted ${deleted.length} log(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(serverData.total / pageSize));
  const pageIds = serverData.data.map((e) => e.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const targetCount = deleteTarget === "all" ? serverData.total : selectedIds.length;

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

      {(selectedIds.length > 0 || true) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/70 p-2">
          <span className="px-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${serverData.total} rows`}
          </span>
          <div className="w-px h-4 bg-[var(--color-border)]" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={exportLoading || isPending}
            className="inline-flex items-center gap-1.5"
          >
            {exportLoading ? <Loader2Icon className="size-3 animate-spin" /> : <FileDownIcon className="size-3" />}
            {selectedIds.length > 0 ? "Download Selected" : "Download All"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => { setDeleteTarget("selected"); setShowDeleteConfirm(true); }}
            disabled={selectedIds.length === 0 || deleteLoading}
            className="inline-flex items-center gap-1.5"
          >
            <Trash2Icon className="size-3" />
            Delete Selected
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => { setDeleteTarget("all"); setShowDeleteConfirm(true); }}
            disabled={serverData.total === 0 || deleteLoading}
            className="inline-flex items-center gap-1.5"
          >
            <Trash2Icon className="size-3" />
            Delete All
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        pageIds.forEach((id) => next.add(id));
                        return [...next];
                      });
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                    }
                  }}
                />
              </TableHead>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No audit log entries found.
                </TableCell>
              </TableRow>
            ) : (
              serverData.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(entry.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          checked ? [...prev, entry.id] : prev.filter((id) => id !== entry.id)
                        );
                      }}
                    />
                  </TableCell>
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

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Audit Logs?</DialogTitle>
            <DialogDescription>
              This will permanently delete {targetCount} audit log(s). A CSV of the deleted records will be downloaded automatically. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
              {deleteLoading ? "Deleting..." : `Delete ${targetCount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
