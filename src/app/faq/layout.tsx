"use client";

import DashboardShell from "@/components/dashboard-shell";
import { parseAccessToken, getAccessToken } from "@/lib/auth";

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = getAccessToken();
  const payload = token ? parseAccessToken(token) : null;
  const hasToken = !!payload;

  if (hasToken) {
    return <DashboardShell>{children}</DashboardShell>;
  }
  return <>{children}</>;
}
