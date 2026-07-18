"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listUsersAction,
  banUserAction,
  unbanUserAction,
  deleteUserAction,
} from "../server/user.actions";
import { getCurrentUser } from "@/features/auth/server/auth.actions";
import { usePagination, Paginator } from "@/components/ui/paginator";
import { SkeletonTable } from "@/components/ui/skeleton";
import type { UserRole } from "@/types/organization";

interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: UserRole | null;
  is_attendee: boolean;
}

export default function UsersList() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const [usersData, user] = await Promise.all([
      listUsersAction(),
      getCurrentUser(),
    ]);
    setUsers(usersData as ManagedUser[]);
    setCurrentUserId(user?.id ?? null);
    setLoaded(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleBan(userId: string) {
    if (!confirm("Ban this user? They will not be able to log in.")) return;
    const result = await banUserAction(userId);
    if (result?.error) {
      alert(result.error);
    } else {
      loadUsers();
    }
  }

  async function handleUnban(userId: string) {
    if (!confirm("Unban this user?")) return;
    const result = await unbanUserAction(userId);
    if (result?.error) {
      alert(result.error);
    } else {
      loadUsers();
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    const result = await deleteUserAction(userId);
    if (result?.error) {
      alert(result.error);
    } else {
      loadUsers();
    }
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } =
    usePagination(filtered, 10);

  return (
    <div className="space-y-4">
      {loading && <SkeletonTable rows={5} />}

      {!loading && loaded && users.length === 0 && (
        <p className="text-muted-foreground text-sm">No users found.</p>
      )}

      {!loading && loaded && users.length > 0 && (
        <>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-96 rounded-md border px-3 py-2 text-sm"
          />

          <div className="tbl-container">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="text-left">Email</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Role</th>
                  <th className="text-left">Attendee</th>
                  <th className="text-left">Joined</th>
                  <th className="text-left">Last Sign-in</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((user) => (
                  <tr key={user.id}>
                    <td className="text-sm">{user.email}</td>
                    <td className="text-sm text-tertiary">{user.name || "—"}</td>
                    <td>
                      <span className="status-pill status-draft">
                        {user.role ?? "none"}
                      </span>
                    </td>
                    <td>
                      {user.is_attendee ? (
                        <span className="status-pill status-active">Yes</span>
                      ) : (
                        <span className="text-xs text-tertiary">—</span>
                      )}
                    </td>
                    <td className="text-sm text-tertiary">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-sm text-tertiary">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td>
                      {user.banned_until ? (
                        <span className="status-pill status-revoked">Banned</span>
                      ) : (
                        <span className="status-pill status-active">Active</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {user.id !== currentUserId && (
                        <>
                          {user.banned_until ? (
                            <button
                              onClick={() => handleUnban(user.id)}
                              className="text-xs text-info hover:underline mr-3"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(user.id)}
                              className="text-xs text-amber-600 hover:underline mr-3"
                            >
                              Ban
                            </button>
                          )}
                          {user.role !== "admin" && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-xs text-danger hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
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
              setPageSize={setPageSize}
            />
          </div>
        </>
      )}
    </div>
  );
}
