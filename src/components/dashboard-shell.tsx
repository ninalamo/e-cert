"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import type { Organization } from "@/types/organization";
import { getMyOrganizationsAction } from "@/features/organizations/server/organization.actions";
import { logout } from "@/features/auth/server/auth.actions";
import Sidebar from "@/components/sidebar";
import OrgSwitcher from "@/features/organizations/components/org-switcher";
import { useSearchParams, useRouter } from "next/navigation";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    searchParams.get("org")
  );

  useEffect(() => {
    let cancelled = false;
    getMyOrganizationsAction().then((data) => {
      if (cancelled) return;
      if (!currentOrgId && data.length > 0) {
        setCurrentOrgId(data[0].id);
        router.replace(`/dashboard?org=${data[0].id}`);
      }
      if (data.length === 0) {
        router.replace("/dashboard/create-org");
      }
    });
    return () => { cancelled = true; };
  }, [currentOrgId, router]);

  const handleOrgSelect = useCallback((org: Organization) => {
    setCurrentOrgId(org.id);
    router.push(`/dashboard?org=${org.id}`);
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <OrgSwitcher currentOrgId={currentOrgId} onSelect={handleOrgSelect} />
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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <DashboardShellInner>{children}</DashboardShellInner>
    </Suspense>
  );
}
