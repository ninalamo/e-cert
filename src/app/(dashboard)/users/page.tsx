import { requireRole } from "@/lib/permissions";
import UsersList from "@/features/users/components/users-list";

export default async function UsersPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage user accounts and access
        </p>
      </div>
      <UsersList />
    </div>
  );
}
