"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const CertificateDetail = dynamic(() => import("@/features/certificates/components/certificate-detail"), { ssr: false });

export default function MyCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CertificateDetail certificateId={id} showAdminFeatures={false} />;
}
