import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CertificatesList from "@/features/certificates/components/certificates-list";

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700">Certificates</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
          <CertificatesList initialQuery={q ?? ""} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
