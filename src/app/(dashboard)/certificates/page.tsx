import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CertificatesList from "@/features/certificates/components/certificates-list";
import { getCertificates } from "@/features/certificates/server/certificate.service";
import { requireRole } from "@/lib/permissions";
import { ORG_ID } from "@/lib/org";

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  await requireRole(["admin", "staff"]);
  const certificates = await getCertificates(ORG_ID);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700">Certificates</CardTitle>
      </CardHeader>
      <CardContent>
        <CertificatesList initialCertificates={certificates} initialQuery={q ?? ""} />
      </CardContent>
    </Card>
  );
}
