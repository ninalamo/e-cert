import { ORG_NAME } from "@/lib/org";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import UserMenu from "@/components/user-menu";
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
            <UserMenu name={session.name ?? session.email} />
          </div>
        </header>
        <main className="p-4 pb-safe lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
