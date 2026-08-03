import { ORG_NAME } from "@/lib/org";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import UserMenu from "@/components/user-menu";
import WhatsNew from "@/components/whats-new";
import RoleSwitcher from "@/components/role-switcher";
import type { SessionUser } from "@/lib/permissions";

const roleHeaderColors: Record<string, string> = {
  admin: "border-b-red-500/50",
  staff: "border-b-blue-500/50",
  participant: "border-b-green-500/50",
};

export default async function DashboardShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionUser;
}) {
  const isDemo = process.env.DEMO === "true";
  const borderClass = isDemo ? (roleHeaderColors[session.role] ?? "") : "";
  const version = process.env.NEXT_PUBLIC_VERSION ?? "";

  return (
    <div className="flex h-screen bg-surface-muted">
      <Sidebar role={session.role} />
      <div className="flex-1 overflow-y-auto">
        <header className={`flex items-center justify-between border-b border-default bg-surface px-4 py-3 lg:px-6 ${borderClass}`}>
          <div className="flex items-center gap-2">
            <MobileNav role={session.role} />
            <span className="text-sm font-medium text-secondary">{ORG_NAME}</span>
            {version && (
              <span className="rounded-full bg-[var(--color-surface-tertiary)] px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-text-muted)]">
                v{version}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {session.role !== "participant" && (
              <WhatsNew userKey={session.email ?? session.id} />
            )}
            {isDemo && <RoleSwitcher currentRole={session.role} />}
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
