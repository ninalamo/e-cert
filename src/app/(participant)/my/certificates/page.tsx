"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { certificatesApi } from "@/lib/api/certificates";
import type { CertificateWithEvent } from "@/lib/api/certificates";

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    certificatesApi
      .getMy()
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">My Certificates</h1>
        <p className="text-sm text-secondary">
          Certificates issued to you by the organization.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-tertiary">Loading...</p>
          </CardContent>
        </Card>
      ) : certificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-tertiary">
              No certificates have been issued to you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert) => (
            <Link key={cert.id} href={`/my/certificates/${cert.id}`}>
              <Card className="transition-colors hover:border-brand-600">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <p className="font-medium text-primary">
                      {cert.events?.name ?? cert.certificate_number}
                    </p>
                    <p className="text-xs text-tertiary">
                      {cert.certificate_number}
                      · Issued {new Date(cert.issued_at).toLocaleDateString()}
                      {cert.expires_at &&
                        ` · Expires ${new Date(cert.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cert.revoked_at ? (
                      <span className="status-pill status-danger">REVOKED</span>
                    ) : cert.expires_at &&
                      new Date(cert.expires_at) < new Date() ? (
                      <span className="status-pill status-warning">EXPIRED</span>
                    ) : (
                      <span className="status-pill status-active">VALID</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
