import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;

  const { data: certificate, error } = await supabaseAdmin
    .from("certificates")
    .select(`
      certificate_number,
      issued_at,
      expires_at,
      revoked_at,
      recipient_name,
      events ( name ),
      organizations ( name )
    `)
    .eq("certificate_number", number)
    .single();

  if (error || !certificate) {
    return NextResponse.json(
      { valid: false, error: "Certificate not found" },
      { status: 404, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  }

  let status: "active" | "revoked" | "expired" = "active";

  if (certificate.revoked_at) {
    status = "revoked";
  } else if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
    status = "expired";
  }

  const event = certificate.events as unknown as { name: string } | null;
  const org = certificate.organizations as unknown as { name: string } | null;

  return NextResponse.json({
    valid: true,
    certificate_number: certificate.certificate_number,
    issued_date: certificate.issued_at,
    valid_until: certificate.expires_at,
    status,
    recipient_name: certificate.recipient_name,
    organization: org ? { name: org.name } : null,
    event_name: event?.name ?? null,
  }, { headers: CACHE_HEADERS });
}
