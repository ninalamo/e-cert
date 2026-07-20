import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { getCertificatePdfBuffer } from "@/features/certificates/server/certificate.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certRepo = new CertificateRepository(supabase);
  const certificate = await certRepo.findById(id);
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: "PDF not available. Please open the certificate and download from there." },
      { status: 404 }
    );
  }
}
