"use client";

import type { ReactNode } from "react";
import { getCurrentGroups } from "@/lib/permissions";
import { hasDashboardAccess } from "@/lib/roles";
import { NotFoundState } from "@/components/not-found-state";

/**
 * Role gate for dashboard pages that cannot check access themselves
 * (e.g. server components). cert-user has no dashboard access;
 * participant pages under /my are unaffected.
 */
export default function DashboardGate({
  children,
  description = "Your account does not have permission to view this page.",
}: {
  children: ReactNode;
  description?: string;
}) {
  if (!hasDashboardAccess(getCurrentGroups())) {
    return (
      <NotFoundState
        title="Insufficient access"
        description={description}
        backHref="/my"
        backLabel="Back to My Certificates"
      />
    );
  }

  return <>{children}</>;
}
