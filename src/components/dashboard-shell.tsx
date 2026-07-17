import { ORG_NAME } from "@/lib/org";
import { logout } from "@/features/auth/server/auth.actions";
import Sidebar from "@/components/sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <span className="text-sm font-medium">{ORG_NAME}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-gray-600 hover:text-black"
            >
              Logout
            </button>
          </form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
