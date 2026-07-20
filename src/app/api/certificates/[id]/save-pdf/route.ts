import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { getCurrentSession } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const certRepo = new CertificateRepository(supabase);
  const certificate = await certRepo.findById(id);
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  if (session.role === "participant" && certificate.recipient_email !== session.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { pdf_base64 } = await request.json();
  if (!pdf_base64 || typeof pdf_base64 !== "string") {
    return NextResponse.json({ error: "Missing pdf_base64" }, { status: 400 });
  }

  const metadata = {
    ...(certificate.metadata ?? {}),
    rendered_pdf: pdf_base64,
  };

  await certRepo.update(id, { metadata } as never);

  return NextResponse.json({ success: true });
}
