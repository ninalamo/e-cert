import { ORG_NAME } from "@/lib/org";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import Breadcrumbs from "@/components/breadcrumbs";

import { ThemeToggle } from "@/components/theme-toggle";
import LogoutButton from "@/components/logout-button";
import WhatsNew from "@/components/whats-new";
import type { SessionUser } from "@/lib/permissions";

export default function DashboardShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionUser;
}) {
  return (
    <div className="flex h-screen bg-surface-muted">
      <Sidebar role={session.role} />
      <div className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-default bg-surface px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2">
            <MobileNav role={session.role} />
            <span className="text-sm font-medium text-secondary">{ORG_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            {session.role !== "participant" && (
              <WhatsNew userKey={session.email ?? session.id} />
            )}
            <ThemeToggle />
            <span className="hidden text-xs text-tertiary sm:inline">{session.name ?? session.email}</span>
            <LogoutButton />
          </div>
        </header>
        <main className="p-4 pb-safe lg:p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
