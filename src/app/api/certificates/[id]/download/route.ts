import { NextRequest, NextResponse } from "next/server";
import * as certService from "@/features/certificates/server/certificate.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const certificate = await certService.getCertificate(id);
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  if (certificate.revoked_at) {
    return NextResponse.json({ error: "Certificate has been revoked" }, { status: 410 });
  }

  try {
    const pdfBuffer = await certService.getCertificatePdfBuffer(certificate);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
