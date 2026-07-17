import { ORG_NAME } from "@/lib/org";
import { logout } from "@/features/auth/server/auth.actions";
import Sidebar from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-default bg-surface px-6 py-3">
          <span className="text-sm font-medium text-secondary">{ORG_NAME}</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-tertiary hover:text-text transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
