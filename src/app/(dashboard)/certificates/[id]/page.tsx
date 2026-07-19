"use client";

import { use } from "react";
import CertificateDetail from "@/features/certificates/components/certificate-detail";

export default function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CertificateDetail certificateId={id} showAdminFeatures />;
}
