import { NextRequest, NextResponse } from "next/server";
import * as certService from "@/features/certificates/server/certificate.service";
import { getCertificatePdfBuffer } from "@/features/certificates/server/certificate.service";

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

  const cachedPdf = (certificate.metadata as Record<string, unknown> | null)
    ?.rendered_pdf;
  if (typeof cachedPdf === "string") {
    const pdfBuffer = Buffer.from(cachedPdf, "base64");
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
      },
    });
  }

  try {
    const pdfBuffer = await getCertificatePdfBuffer(certificate);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
      },
    });
  } catch {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/certificates/${id}`);
  }
}
