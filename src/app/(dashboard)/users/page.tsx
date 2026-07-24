import { requireRole } from "@/lib/permissions";
import UsersList from "@/features/users/components/users-list";
import { listUsers } from "@/features/users/server/user.service";
import { getCurrentUser } from "@/features/auth/server/auth.actions";

export default async function UsersPage() {
  await requireRole(["admin"]);
  const [users, currentUser] = await Promise.all([
    listUsers(),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage user accounts and access
        </p>
      </div>
      <UsersList initialUsers={users} currentUserId={currentUser?.id ?? null} />
    </div>
  );
}
