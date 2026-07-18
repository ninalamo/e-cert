import { notFound } from "next/navigation";
import { getMyCertificateAction } from "@/features/certificates/server/certificate.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MyCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await getMyCertificateAction(id);

  if (!cert) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-brand-700">Certificate Details</CardTitle>
            {cert.revoked_at ? (
              <span className="status-pill status-danger">REVOKED</span>
            ) : cert.expires_at && new Date(cert.expires_at) < new Date() ? (
              <span className="status-pill status-warning">EXPIRED</span>
            ) : (
              <span className="status-pill status-active">VALID</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">
                Certificate Number
              </p>
              <p className="font-mono font-medium text-primary">
                {cert.certificate_number}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">
                Recipient
              </p>
              <p className="font-medium text-primary">{cert.recipient_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">
                Email
              </p>
              <p className="text-primary">{cert.recipient_email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">
                Issued Date
              </p>
              <p className="text-primary">
                {new Date(cert.issued_at).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">
                Valid Until
              </p>
              <p className="text-primary">
                {cert.expires_at
                  ? new Date(cert.expires_at).toLocaleDateString()
                  : "No expiry"}
              </p>
            </div>
            {cert.revoked_at && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-tertiary">
                  Revoked
                </p>
                <p className="text-danger-text">
                  {new Date(cert.revoked_at).toLocaleDateString()}
                  {cert.revoke_reason && ` — ${cert.revoke_reason}`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
