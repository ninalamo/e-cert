"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  getCertificatesAction,
  revokeCertificateAction,
} from "../server/certificate.actions";
import type { Certificate } from "@/types/certificate";

function CertificatesListInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadCertificates = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const data = await getCertificatesAction(orgId);
    setCertificates(data);
    setLoaded(true);
    setLoading(false);
  }, [orgId]);

  async function handleRevoke(id: string, number: string) {
    const reason = prompt(`Reason for revoking ${number}:`);
    if (!reason) return;
    const result = await revokeCertificateAction(id, reason);
    if (result?.error) {
      alert(result.error);
    } else {
      loadCertificates();
    }
  }

  if (!orgId) {
    return <p className="text-muted-foreground">Select an organization first.</p>;
  }

  const filtered = certificates.filter(
    (c) =>
      c.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      c.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
      c.certificate_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by name, email, or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-96 rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          {!loaded && (
            <button onClick={loadCertificates} className="text-sm text-blue-600 hover:underline">
              Load certificates
            </button>
          )}
          <a
            href={`/dashboard/certificates/issue?org=${orgId}`}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Issue Certificate
          </a>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading certificates...</p>}

      {!loading && loaded && filtered.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No certificates found.</p>
        </div>
      )}

      {!loading && loaded && filtered.length > 0 && (
        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2 text-left">Number</th>
                <th className="px-4 py-2 text-left">Recipient</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Issued</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert) => (
                <tr key={cert.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{cert.certificate_number}</td>
                  <td className="px-4 py-2">{cert.recipient_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cert.recipient_email}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(cert.issued_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    {cert.revoked_at ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        Revoked
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={`/dashboard/certificates/${cert.id}?org=${orgId}`}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      View
                    </a>
                    {!cert.revoked_at && (
                      <button
                        onClick={() => handleRevoke(cert.id, cert.certificate_number)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CertificatesList() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <CertificatesListInner />
    </Suspense>
  );
}
