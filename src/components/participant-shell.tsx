import { ORG_NAME } from "@/lib/org";
import ParticipantSidebar from "@/components/participant-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import LogoutButton from "@/components/logout-button";
import type { SessionUser } from "@/lib/permissions";

export default function ParticipantShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionUser;
}) {
  return (
    <div className="flex h-screen bg-surface-muted">
      <ParticipantSidebar />
      <div className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-default bg-surface px-6 py-3">
          <span className="text-sm font-medium text-secondary">{ORG_NAME}</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs text-tertiary">{session.name ?? session.email}</span>
            <LogoutButton />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
