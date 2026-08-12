"use client";

import { AuthGuard } from "@/lib/auth";
import DashboardShell from "@/components/dashboard-shell";

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
