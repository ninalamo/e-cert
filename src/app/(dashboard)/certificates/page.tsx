"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CertificatesList from "@/features/certificates/components/certificates-list";
import { certificatesApi } from "@/lib/api/certificates";
import { parseAccessToken, getAccessToken } from "@/lib/auth";
import { ORG_ID } from "@/lib/org";
import type { CertificateWithEvent } from "@/lib/api/certificates";

export default function CertificatesPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const token = getAccessToken();
  const user = token ? parseAccessToken(token) : null;
  const isAdmin = user?.groups?.includes("admin") ?? false;

  const [certificates, setCertificates] = useState<CertificateWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    certificatesApi
      .listWithEvent(ORG_ID)
      .then((result) => {
        if (!active) return;
        setCertificates(result.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

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
