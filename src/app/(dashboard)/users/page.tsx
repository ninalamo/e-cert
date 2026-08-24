"use client";

import { useEffect, useState } from "react";
import { usersAdminApi, type ManagedUser } from "@/lib/api/users-admin";
import { canManageUserStatus, canViewUsers } from "@/lib/permissions";
import { NotFoundState } from "@/components/not-found-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { getCurrentSession } from "@/lib/permissions";
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

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    user: ManagedUser;
    next: StatusAction;
  } | null>(null);
  const [working, setWorking] = useState(false);

  const canView = canViewUsers();
  const canManage = canManageUserStatus();
  const currentSub = getCurrentSession()?.id ?? null;

  useEffect(() => {
    if (!canView) return;
    let active = true;
    usersAdminApi
      .list()
      .then((result) => {
        if (!active) return;
        setUsers(result.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoadError("Failed to load users.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [canView]);

  async function applyStatus() {
    if (!confirmTarget) return;
    setWorking(true);
    setActionError(null);
    try {
      await usersAdminApi.setStatus(confirmTarget.user.id, confirmTarget.next);
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
          Manage platform access — disable to revoke sessions, never delete
        </p>
      </div>

      {actionError && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {actionError}
        </div>
      )}

      {loading ? (
        <SkeletonTable />
      ) : loadError ? (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {loadError}
        </div>
      ) : users.length === 0 ? (
        <NotFoundState title="No users found" />
      ) : (
        <div className="app-card divide-y divide-border overflow-hidden">
          {users.map((user) => {
            const isSelf = user.id === currentSub;
            return (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--color-text)]">
                    {user.name || "—"}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-tertiary">(you)</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-tertiary">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {user.status === "disabled" ? (
                    <span className="status-pill status-revoked">Disabled</span>
                  ) : (
                    <span className="status-pill status-active">Active</span>
                  )}
                  {canManage && !isSelf ? (
                    user.status === "active" ? (
                      <button
                        onClick={() => setConfirmTarget({ user, next: "disabled" })}
                        className="btn-icon btn-icon-danger"
                        title="Disable user — revokes all sessions"
                      >
                        <ShieldIcon className="size-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmTarget({ user, next: "active" })}
                        className="btn-disclosure"
                        title="Re-enable user"
                      >
                        Enable
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
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
              {confirmTarget?.next === "disabled" ? "Disable User" : "Enable User"}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.next === "disabled" ? (
                <>
                  Disable <strong>{confirmTarget?.user.email}</strong>? All their active
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
                This never deletes the account or their data — access can be restored anytime.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmTarget?.next === "disabled" ? "destructive" : "default"}
              onClick={applyStatus}
              disabled={working}
            >
              {working
                ? "Saving..."
                : confirmTarget?.next === "disabled"
                  ? "Disable User"
                  : "Enable User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
