"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  usersAdminApi,
  type ManagedGroup,
  type ManagedUser,
} from "@/lib/api/users-admin";
import { userActivityApi } from "@/lib/api/user-activity";
import { NotFoundState } from "@/components/not-found-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Paginator } from "@/components/ui/paginator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canManageUserStatus, canViewUsers, getCurrentSession, getCurrentTenantId } from "@/lib/permissions";
import { UserActivityBadges } from "./user-activity-badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldIcon } from "lucide-react";

type StatusAction = "active" | "disabled";

const PAGE_SIZE_DEFAULT = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function UsersPage() {
  const canView = canViewUsers();
  const canManage = canManageUserStatus();
  const currentSub = getCurrentSession()?.id ?? null;

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [metaTotal, setMetaTotal] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [groups, setGroups] = useState<ManagedGroup[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchRef = useRef("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const [confirmTarget, setConfirmTarget] = useState<{
    user: ManagedUser;
    next: StatusAction;
  } | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!canView) return;
    let active = true;

    // Debounced server fetch: 300ms for search typing, immediate for
    // pagination/group changes.
    const timer = setTimeout(
      () => {
        setIsFetching(true);
        usersAdminApi
          .list({
            search: searchInput.trim() || undefined,
            group_id: groupFilter !== "all" ? groupFilter : undefined,
            limit: pageSize,
            offset: page * pageSize,
          })
          .then((result) => {
            if (!active) return;
            setUsers(result.data ?? []);
            setMetaTotal(result.meta?.total ?? result.data?.length ?? 0);
            setIsFetching(false);
          })
          .catch(() => {
            if (!active) return;
            setLoadError("Failed to load users.");
            setIsFetching(false);
          });
      },
      searchInput !== debouncedSearchRef.current ? SEARCH_DEBOUNCE_MS : 0
    );

    debouncedSearchRef.current = searchInput;

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [canView, searchInput, groupFilter, page, pageSize]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    usersAdminApi
      .listGroups(getCurrentTenantId() ?? undefined)
      .then((result) => {
        if (active) setGroups(result.data ?? []);
      })
      .catch(() => {
        // Filter dropdown is non-critical; hide it on failure.
      });
    return () => {
      active = false;
    };
  }, [canManage]);

  const totalPages = Math.max(1, Math.ceil(metaTotal / pageSize));

  async function applyStatus() {
    if (!confirmTarget) return;
    setWorking(true);
    setActionError(null);
    try {
      await usersAdminApi.setStatus(confirmTarget.user.id, confirmTarget.next);
      userActivityApi.invalidate(confirmTarget.user.email);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === confirmTarget.user.id ? { ...u, status: confirmTarget.next } : u
        )
      );
      setConfirmTarget(null);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to update user status.";
      setActionError(msg);
      setConfirmTarget(null);
    } finally {
      setWorking(false);
    }
  }

  const groupFilterNode = useMemo(() => {
    if (!canManage || groups.length === 0) return null;
    return (
        <Select
          value={groupFilter}
          onValueChange={(value) => {
            setGroupFilter(value ?? "all");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            {/* Base UI Select renders the raw value in the trigger unless
                given a resolver — map group ids back to friendly names. */}
            <SelectValue>
              {(value: string) =>
                value === "all"
                  ? "All groups"
                  : (groups.find((g) => g.id === value)?.name ?? value)
              }
            </SelectValue>
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All groups</SelectItem>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }, [canManage, groups, groupFilter]);

  if (!canView) {
    return (
      <NotFoundState
        title="Insufficient access"
        description="Your account does not have permission to view users."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Users
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Manage platform access — revoke to disable login and sessions, never delete
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(0);
          }}
          placeholder="Search name or email…"
          className="max-w-xs"
        />
        {groupFilterNode}
      </div>

      {actionError && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {actionError}
        </div>
      )}

      {loadError && !isFetching ? (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {loadError}
        </div>
      ) : !isFetching && users.length === 0 ? (
        <NotFoundState title="No users found" />
      ) : (
        <>
          <div className="app-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching
                  ? Array.from({ length: Math.min(pageSize, 6) }).map((_, row) => (
                      <TableRow key={`skeleton-${row}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="mt-1.5 h-3 w-52" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-14" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-6 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  : users.map((user) => {
                  const isSelf = user.id === currentSub;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-medium text-[var(--color-text)]">
                          {user.name || "—"}
                          {isSelf ? (
                            <span className="ml-2 text-xs font-normal text-tertiary">(you)</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-tertiary">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(user.groups ?? []).map((group) => (
                            <span
                              key={group.id}
                              className={`status-pill ${
                                group.name === "loa-auth-admin"
                                  ? "status-revoked"
                                  : ""
                              }`}
                            >
                              {group.name}
                            </span>
                          ))}
                          {(user.groups ?? []).length === 0 ? (
                            <span className="status-pill opacity-50">no group</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <UserActivityBadges email={user.email} />
                      </TableCell>
                      <TableCell>
                        {user.status === "disabled" ? (
                          <span className="status-pill status-revoked">Disabled</span>
                        ) : (
                          <span className="status-pill status-active">Active</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && !isSelf ? (
                          user.status === "active" ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setConfirmTarget({ user, next: "disabled" })
                              }
                            >
                              <ShieldIcon className="mr-1 size-3.5" />
                              Revoke
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setConfirmTarget({ user, next: "active" })
                              }
                            >
                              Enable
                            </Button>
                          )
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Paginator
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={metaTotal}
            setPage={setPage}
            setPageSize={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </>
      )}

      <Dialog
        open={!!confirmTarget}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.next === "disabled" ? "Revoke Access" : "Enable User"}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.next === "disabled" ? (
                <>
                  Revoke access for <strong>{confirmTarget?.user.email}</strong>? All their active
                  sessions will be revoked immediately and they will not be able to log in.
                </>
              ) : (
                <>
                  Restore access for <strong>{confirmTarget?.user.email}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirmTarget?.next === "disabled" && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm">
              <ShieldIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
              <p className="text-[var(--color-warning-text)]">
                This never deletes the account or their data — their certificates stay valid and
                access can be restored anytime.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              No
            </Button>
            <Button
              variant={confirmTarget?.next === "disabled" ? "destructive" : "default"}
              onClick={applyStatus}
              disabled={working}
            >
              {working
                ? "Saving..."
                : confirmTarget?.next === "disabled"
                  ? "Yes, revoke"
                  : "Yes, enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
