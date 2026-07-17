import { getCurrentUser } from "@/features/auth/server/auth.actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome back, {user?.user_metadata?.name ?? user?.email}
      </p>
    </div>
  );
}
