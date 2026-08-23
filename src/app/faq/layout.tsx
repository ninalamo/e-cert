"use client";

import { useSyncExternalStore } from "react";

import DashboardShell from "@/components/dashboard-shell";
import { parseAccessToken, getAccessToken } from "@/lib/auth";

const emptySubscribe = () => () => {};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const token = mounted ? getAccessToken() : null;
  const hasToken = !!(token && parseAccessToken(token));

  if (!hasToken) return <>{children}</>;
  return <DashboardShell>{children}</DashboardShell>;
}
