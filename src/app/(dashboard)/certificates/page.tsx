"use client";

import { useSearchParams } from "next/navigation";
import CertificatesList from "@/features/certificates/components/certificates-list";
import { getCurrentGroups } from "@/lib/permissions";
import { hasDashboardAccess } from "@/lib/roles";
import { NotFoundState } from "@/components/not-found-state";

export default function CertificatesPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const groups = getCurrentGroups();
  const isAdminGroup = groups.includes("cert-admin");

  if (!hasDashboardAccess(groups)) {
    return (
      <NotFoundState
        title="Insufficient access"
        description="Your account does not have permission to view certificates."
        backHref="/my"
        backLabel="Back to My Certificates"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Certificates
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Manage and review issued certificates
        </p>
      </div>
      <CertificatesList
        initialQuery={q}
        isCertAdmin={isAdminGroup}
      />
    </div>
  );
}
