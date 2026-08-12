"use client";

import { useState, useCallback } from "react";
import { usersApi } from "@/lib/api/users";
import type { UserRole } from "@/types/organization";
import { usePagination, Paginator } from "@/components/ui/paginator";

interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: UserRole | null;
  is_attendee: boolean;
  is_main_admin: boolean;
}

interface UsersListProps {
  initialUsers: ManagedUser[];
  currentUserId: string | null;
}

export default function UsersList({ initialUsers, currentUserId }: UsersListProps) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async () => {
    const result = await usersApi.list();
    setUsers((result.data ?? []) as ManagedUser[]);
  }, []);

  async function handleBan(userId: string) {
    if (!confirm("Ban this user? They will not be able to log in.")) return;
    try {
      await usersApi.ban(userId);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { error?: string }).error ?? err.message : "Failed to ban user";
      alert(msg);
    }
  }

  async function handleUnban(userId: string) {
    if (!confirm("Unban this user?")) return;
    try {
      await usersApi.unban(userId);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { error?: string }).error ?? err.message : "Failed to unban user";
      alert(msg);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    try {
      await usersApi.delete(userId);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { error?: string }).error ?? err.message : "Failed to delete user";
      alert(msg);
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    try {
      await usersApi.setRole(userId, role);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { error?: string }).error ?? err.message : "Failed to change role";
      alert(msg);
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
      {users.length === 0 && (
        <p className="text-muted-foreground text-sm">No users found.</p>
      )}

      {users.length > 0 && (
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
  {user.id === currentUserId || user.is_main_admin ? (
    <span className="status-pill status-draft">
      {user.role ?? "none"}
    </span>
  ) : (
    <select
      value={user.role ?? "participant"}
      onChange={(e) =>
        handleRoleChange(user.id, e.target.value as UserRole)
      }
      className="rounded-md border px-2 py-1 text-sm"
    >
      <option value="participant">participant</option>
      <option value="staff">staff</option>
      <option value="admin">admin</option>
    </select>
  )}
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
  {user.id !== currentUserId && !user.is_main_admin && (
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
