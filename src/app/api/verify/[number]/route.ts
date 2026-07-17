import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;

  const { data: certificate, error } = await supabaseAdmin
    .from("certificates")
    .select("certificate_number, recipient_name, issued_at, expires_at, revoked_at")
    .eq("certificate_number", number)
    .single();

  if (error || !certificate) {
    return NextResponse.json(
      { valid: false, error: "Certificate not found" },
      { status: 404 }
    );
  }

  let status: "active" | "revoked" | "expired" = "active";

  if (certificate.revoked_at) {
    status = "revoked";
  } else if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
    status = "expired";
  }

  return NextResponse.json({
    valid: true,
    certificate_number: certificate.certificate_number,
    recipient_name: certificate.recipient_name,
    issued_date: certificate.issued_at,
    valid_until: certificate.expires_at,
    status,
  });
}
