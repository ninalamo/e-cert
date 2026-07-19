import { supabaseAdmin } from "@/lib/supabase/admin";

export async function generateCertificateNumber(organizationId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("certificate_number")
    .eq("organization_id", organizationId)
    .order("certificate_number", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error("Failed to generate certificate number");
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const last = data[0].certificate_number;
    const match = last.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const padded = String(nextNumber).padStart(6, "0");
  return `CERT-${padded}`;
}
