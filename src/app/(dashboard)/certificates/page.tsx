"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CertificatesList from "@/features/certificates/components/certificates-list";
import { certificatesApi } from "@/lib/api/certificates";
import { canManageCertificates, getCurrentGroups, getCurrentSession, DEFAULT_ROLE } from "@/lib/permissions";
import { ORG_ID } from "@/lib/org";
import type { CertificateWithEvent } from "@/lib/api/certificates";

export default function CertificatesPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const role = getCurrentSession()?.role ?? DEFAULT_ROLE;
  const isAdmin = canManageCertificates(role);
  const isAdminGroup = getCurrentGroups().includes("cert-admin");

  const [certificates, setCertificates] = useState<CertificateWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const request = isAdminGroup
      ? certificatesApi.listWithEvent(ORG_ID)
      : certificatesApi.getMy();
    request
      .then((result) => {
        if (!active) return;
        setCertificates(result.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isAdminGroup]);

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
      {loading ? (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">Loading certificates...</p>
        </div>
      ) : (
        <CertificatesList
          initialCertificates={certificates}
          initialQuery={q}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
