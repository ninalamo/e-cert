"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import {
  getCertificatesAction,
  revokeCertificateAction,
} from "../server/certificate.actions";
import type { Certificate } from "@/types/certificate";

interface CertificatesListProps {
  initialCertificates: Certificate[];
  initialQuery?: string;
}

export default function CertificatesList({ initialCertificates, initialQuery = "" }: CertificatesListProps) {
  const [certificates, setCertificates] = useState<Certificate[]>(initialCertificates);
  const [search, setSearch] = useState(initialQuery);

  const loadCertificates = useCallback(async () => {
    const data = await getCertificatesAction(ORG_ID);
    setCertificates(data);
  }, []);

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
      </div>

      {filtered.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No certificates found.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="tbl-container">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">Number</th>
                <th className="text-left">Recipient</th>
                <th className="text-left">Email</th>
                <th className="text-left">Issued</th>
                <th className="text-left">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert) => (
                <tr key={cert.id}>
                  <td className="font-mono text-xs">{cert.certificate_number}</td>
                  <td>{cert.recipient_name}</td>
                  <td className="text-tertiary">{cert.recipient_email}</td>
                  <td className="text-tertiary">
                    {new Date(cert.issued_at).toLocaleDateString()}
                  </td>
                  <td>
                    {cert.revoked_at ? (
                      <span className="status-pill status-revoked">
                        Revoked
                      </span>
                    ) : (
                      <span className="status-pill status-active">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/certificates/${cert.id}`}
                      className="text-xs text-info hover:underline mr-3"
                    >
                      View
                    </Link>
                    {!cert.revoked_at && (
                      <button
                        onClick={() => handleRevoke(cert.id, cert.certificate_number)}
                        className="text-xs text-danger hover:underline"
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
