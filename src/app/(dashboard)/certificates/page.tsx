"use client";

import { useSearchParams } from "next/navigation";
import CertificatesList from "@/features/certificates/components/certificates-list";
import { getCurrentGroups } from "@/lib/permissions";

export default function CertificatesPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const groups = getCurrentGroups();
  const isAdminGroup = groups.includes("cert-admin");
  // Staff see the org list scoped server-side by event visibility
  // (public + authored private events); participants see only their own.
  const mode = isAdminGroup || groups.includes("cert-staff") ? "all" : "mine";

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
        mode={mode}
        initialQuery={q}
        isCertAdmin={isAdminGroup}
      />
    </div>
  );
}
