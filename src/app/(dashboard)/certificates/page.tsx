"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700">Certificates</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-tertiary">Loading...</p>
        ) : (
          <CertificatesList
            initialCertificates={certificates}
            initialQuery={q}
            isAdmin={isAdmin}
          />
        )}
      </CardContent>
    </Card>
  );
}
