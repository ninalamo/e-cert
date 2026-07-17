import { getCurrentUser } from "@/features/auth/server/auth.actions";
import { logout } from "@/features/auth/server/auth.actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {user?.user_metadata?.name ?? user?.email}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
